import request from 'supertest';
import { inject } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ApplicationDetailSchema,
  ApplicationListSchema,
  DEFAULT_LIST_PARAMS,
} from '@semakan/contract';
import { queryApplications, seedApplicationDetails, seedApplications } from '@semakan/seed';
import { createTestApp } from './app';
import { resetDatabase } from './database';

let app: INestApplication;
let ds: DataSource;

beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  app = await createTestApp();
  ds = app.get(DataSource);
});
beforeEach(() => resetDatabase(ds));
afterAll(() => app?.close());

describe('GET /api/v1/applications', () => {
  it('lists applications with the default parameters, matching the reference query', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/applications').expect(200);
    expect(ApplicationListSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toEqual(queryApplications(seedApplications(), DEFAULT_LIST_PARAMS));
  });

  it('falls back to defaults when the query params are invalid', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications?status=nonsense&page=-3')
      .expect(200);
    expect(res.body).toEqual(queryApplications(seedApplications(), DEFAULT_LIST_PARAMS));
  });
});

describe('GET /api/v1/applications/:id', () => {
  it('returns the detail for a known id with a strong ETag', async () => {
    const expected = seedApplicationDetails().find((a) => a.id === 'app-001')!;
    const res = await request(app.getHttpServer()).get('/api/v1/applications/app-001').expect(200);
    expect(ApplicationDetailSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toEqual(expected);
    expect(res.headers.etag).toBe(`"${expected.version}"`);
  });

  it('returns a 404 problem+json for an unknown id', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/applications/app-999').expect(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({
      title: 'Application not found',
      code: 'not_found',
      message: 'Application not found',
    });
  });
});

it('publishes the applications paths in the OpenAPI document', async () => {
  const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
  expect(Object.keys(res.body.paths)).toEqual(
    expect.arrayContaining(['/api/v1/applications', '/api/v1/applications/{id}']),
  );
});
