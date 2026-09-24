import request from 'supertest';
import { inject } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './app';

let app: INestApplication;
beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  app = await createTestApp();
});
afterAll(() => app.close());

it('reports liveness and readiness', async () => {
  await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
  await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok' });
});

it('answers unknown routes with problem+json the frontend can read', async () => {
  const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({ type: 'about:blank', status: 404, message: expect.any(String) });
});

it('publishes an OpenAPI 3.1 document', async () => {
  const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
  expect(res.body.openapi).toBe('3.1.0');
});

it('reports not ready with a 503 problem when the database query fails', async () => {
  vi.spyOn(app.get(DataSource), 'query').mockRejectedValueOnce(new Error('connection refused'));
  const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({ status: 503, title: 'Service Unavailable' });
});
