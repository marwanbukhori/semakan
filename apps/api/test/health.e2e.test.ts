import request from 'supertest';
import { inject } from 'vitest';
import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure';
import { createTestApp } from './app';

let app: INestApplication;
beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  app = await createTestApp();
});
afterAll(() => app?.close());

it('reports liveness and readiness', async () => {
  await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
  await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok' });
});

it('answers unknown routes with problem+json the frontend can read', async () => {
  const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({ type: 'about:blank', status: 404, message: expect.any(String) });
});

it('does not advertise Express in an X-Powered-By header', async () => {
  const res = await request(app.getHttpServer()).get('/health/live').expect(200);
  expect(res.headers['x-powered-by']).toBeUndefined();
});

it('does not mount the API docs in production', async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const prod = configureApp(moduleRef.createNestApplication(), { NODE_ENV: 'production' });
  await prod.init();
  try {
    await request(prod.getHttpServer()).get('/docs-json').expect(404);
    await request(prod.getHttpServer()).get('/docs').expect(404);
  } finally {
    await prod.close();
  }
});

it('publishes an OpenAPI 3.1 document', async () => {
  const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
  expect(res.body.openapi).toBe('3.1.0');
});

it('reports not ready with a 503 problem when the database query fails, logging the reason', async () => {
  vi.spyOn(app.get(DataSource), 'query').mockRejectedValueOnce(new Error('connection refused'));
  const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({ status: 503, title: 'Service Unavailable' });
  expect(log.mock.calls.some((call) => String(call[0]).includes('connection refused'))).toBe(true);
  log.mockRestore();
});
