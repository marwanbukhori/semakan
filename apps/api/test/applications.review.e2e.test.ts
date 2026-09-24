import request from 'supertest';
import { inject } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApplicationDetailSchema } from '@semakan/contract';
import type { ApplicationDetail } from '@semakan/contract';
import { isReviewable, requiresFireCertificate } from '@semakan/domain';
import { CURRENT_OFFICER, seedApplicationDetails } from '@semakan/seed';
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

const seed = seedApplicationDetails();
const hasFireCertificate = (a: ApplicationDetail) =>
  a.documents.some((d) => d.kind === 'fire_certificate');

/** Reviewable and approvable: no fire certificate is needed for its category. */
const approvable = seed.find(
  (a) => isReviewable(a.status) && !requiresFireCertificate(a.premisesCategory),
)!;
/**
 * The seed already has a reviewable food/entertainment application without a
 * fire certificate, so no document has to be deleted for this test.
 */
const missingFireCertificate = seed.find(
  (a) =>
    isReviewable(a.status) && requiresFireCertificate(a.premisesCategory) && !hasFireCertificate(a),
)!;
const approved = seed.find((a) => a.status === 'approved')!;

const approve = (version: number) => ({ version, review: { decision: 'approve', note: '' } });

function review(id: string, body: unknown, headers: Record<string, string> = {}) {
  const req = request(app.getHttpServer()).post(`/api/v1/applications/${id}/review`);
  for (const [name, value] of Object.entries(headers)) req.set(name, value);
  return req.send(body as object);
}

async function storedVersion(id: string): Promise<number> {
  const [row] = await ds.query<[{ version: number }]>(
    'SELECT version FROM applications WHERE id = $1',
    [id],
  );
  return row.version;
}

async function timelineCount(id: string): Promise<number> {
  const [row] = await ds.query<[{ n: number }]>(
    'SELECT count(*)::int AS n FROM timeline_events WHERE application_id = $1',
    [id],
  );
  return row.n;
}

describe('POST /api/v1/applications/:id/review', () => {
  it('seed fixtures exist', () => {
    expect(approvable).toBeDefined();
    expect(missingFireCertificate).toBeDefined();
    expect(approved).toBeDefined();
  });

  it('approves a reviewable application and returns the new detail with a new ETag', async () => {
    const { id, version } = approvable;
    const res = await review(id, approve(version), { 'If-Match': `"${version}"` }).expect(200);

    const detail = ApplicationDetailSchema.parse(res.body);
    expect(detail.status).toBe('approved');
    expect(detail.version).toBe(version + 1);
    expect(detail.assignedOfficerName).toBe(CURRENT_OFFICER);
    expect(res.headers.etag).toBe(`"${version + 1}"`);

    const after = await request(app.getHttpServer()).get(`/api/v1/applications/${id}`).expect(200);
    const { timeline } = ApplicationDetailSchema.parse(after.body);
    expect(timeline).toHaveLength(approvable.timeline.length + 1);
    expect(timeline.at(-1)).toMatchObject({
      kind: 'status_changed',
      from: approvable.status,
      to: 'approved',
      actor: CURRENT_OFFICER,
    });
    expect(after.headers.etag).toBe(`"${version + 1}"`);
  });

  it('accepts a weak or unquoted If-Match', async () => {
    const [a, b] = seed.filter(
      (x) => isReviewable(x.status) && !requiresFireCertificate(x.premisesCategory),
    ) as [ApplicationDetail, ApplicationDetail];
    await review(a.id, approve(a.version), { 'If-Match': `W/"${a.version}"` }).expect(200);
    await review(b.id, approve(b.version), { 'If-Match': String(b.version) }).expect(200);
  });

  it('returns 428 without If-Match', async () => {
    const res = await review(approvable.id, approve(approvable.version)).expect(428);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({ code: 'precondition_required' });
  });

  it('returns 400 invalid_if_match for a malformed If-Match', async () => {
    const res = await review(approvable.id, approve(approvable.version), {
      'If-Match': '*',
    }).expect(400);
    expect(res.body).toMatchObject({ code: 'invalid_if_match' });
  });

  it('returns 400 version_mismatch when If-Match and the body disagree', async () => {
    const { id, version } = approvable;
    const res = await review(id, approve(version), { 'If-Match': `"${version + 1}"` }).expect(400);
    expect(res.body).toMatchObject({ code: 'version_mismatch' });
    expect(await storedVersion(id)).toBe(version);
  });

  it('returns 409 version_conflict as problem+json for a stale version', async () => {
    const { id, version } = approvable;
    await review(id, approve(version), { 'If-Match': `"${version}"` }).expect(200);
    const res = await review(id, approve(version), { 'If-Match': `"${version}"` }).expect(409);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({
      title: 'Updated by another officer',
      message: 'Updated by another officer',
      code: 'version_conflict',
    });
  });

  it('returns 422 missing_fire_certificate when approving without a fire certificate', async () => {
    const { id, version } = missingFireCertificate;
    const res = await review(id, approve(version), { 'If-Match': `"${version}"` }).expect(422);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({
      title: 'Review rejected',
      message: 'Review rejected',
      fieldErrors: { decision: ['missing_fire_certificate'] },
    });
    expect(await storedVersion(id)).toBe(version);
  });

  it('returns 422 not_reviewable for an approved application', async () => {
    const { id, version } = approved;
    const res = await review(id, approve(version), { 'If-Match': `"${version}"` }).expect(422);
    expect(res.body).toMatchObject({ fieldErrors: { decision: ['not_reviewable'] } });
  });

  it('returns 422 with the mock field errors for a short reject reason', async () => {
    const { id, version } = approvable;
    const res = await review(
      id,
      { version, review: { decision: 'reject', reason: 'short' } },
      { 'If-Match': `"${version}"` },
    ).expect(422);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.body).toMatchObject({
      title: 'Invalid review',
      message: 'Invalid review',
      fieldErrors: { reason: ['reason_too_short'] },
    });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await review('app-999', approve(1), { 'If-Match': '"1"' }).expect(404);
    expect(res.body).toMatchObject({ code: 'not_found' });
  });

  it('lets exactly one of two concurrent reviews of the same version win', async () => {
    const { id, version } = approvable;
    const eventsBefore = await timelineCount(id);
    const server = app.getHttpServer();
    const send = () =>
      request(server)
        .post(`/api/v1/applications/${id}/review`)
        .set('If-Match', `"${version}"`)
        .send(approve(version));

    const responses = await Promise.all([send(), send()]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await storedVersion(id)).toBe(version + 1);
    expect(await timelineCount(id)).toBe(eventsBefore + 1);
  });

  describe('Idempotency-Key', () => {
    it('replays the stored response for the same key and body', async () => {
      const { id, version } = approvable;
      const headers = { 'If-Match': `"${version}"`, 'Idempotency-Key': 'key-1' };
      const first = await review(id, approve(version), headers).expect(200);
      // Same body with keys in a different order: canonical JSON hashes it the same.
      const second = await review(
        id,
        { review: { note: '', decision: 'approve' }, version },
        headers,
      ).expect(200);

      expect(second.body).toEqual(first.body);
      expect(second.headers.etag).toBe(`"${version + 1}"`);
      expect(await storedVersion(id)).toBe(version + 1);
      expect(await timelineCount(id)).toBe(approvable.timeline.length + 1);
    });

    it('returns 409 idempotency_key_reused for the same key with a different body', async () => {
      const { id, version } = approvable;
      const headers = { 'If-Match': `"${version}"`, 'Idempotency-Key': 'key-2' };
      await review(id, approve(version), headers).expect(200);
      const res = await review(
        id,
        { version, review: { decision: 'approve', note: 'different' } },
        headers,
      ).expect(409);
      expect(res.body).toMatchObject({ code: 'idempotency_key_reused' });
      expect(await storedVersion(id)).toBe(version + 1);
    });

    it('does not store failed responses, so a failed request can be retried', async () => {
      const { id, version } = missingFireCertificate;
      const headers = { 'If-Match': `"${version}"`, 'Idempotency-Key': 'key-3' };
      await review(id, approve(version), headers).expect(422);
      const [{ n }] = await ds.query<[{ n: number }]>(
        'SELECT count(*)::int AS n FROM idempotency_keys',
      );
      expect(n).toBe(0);
    });
  });
});

it('publishes the review path in the OpenAPI document', async () => {
  const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
  expect(Object.keys(res.body.paths)).toContain('/api/v1/applications/{id}/review');
  const post = (res.body as { paths: Record<string, { post?: { requestBody?: unknown } }> }).paths[
    '/api/v1/applications/{id}/review'
  ]?.post;
  expect(post?.requestBody).toMatchObject({
    content: { 'application/json': { schema: { required: ['version', 'review'] } } },
  });
});
