import { ApplicationDetailSchema, ApplicationListSchema } from '@/features/applications/schemas';
import { isReviewable } from '@/features/applications/rules';
import { ApiError } from '@/shared/api/ApiError';
import { apiClient } from '@/shared/api/client';
import { getDevControls, setDevControls } from '../devControls';
import { requiresFireCertificate, seedApplicationDetails } from '../db/applications';

const getList = (params: Record<string, string> = {}) =>
  apiClient.get('/applications', ApplicationListSchema, { params });

const details = seedApplicationDetails();
const openApp = details.find(
  (d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory),
)!;
const getDetail = (id: string) => apiClient.get(`/applications/${id}`, ApplicationDetailSchema);
const postReview = (id: string, body: unknown) =>
  apiClient.post(`/applications/${id}/review`, ApplicationDetailSchema, body);

describe('GET /api/applications', () => {
  it('serves a filtered page that matches the contract', async () => {
    const data = await getList({ status: 'approved' });
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.every((item) => item.status === 'approved')).toBe(true);
  });

  it('treats tampered params as defaults', async () => {
    const data = await getList({ page: 'abc', sort: 'password' });
    expect(data).toMatchObject({ page: 1, total: 57 });
  });

  it('returns 500 when the Dev Panel forces a server error', async () => {
    setDevControls({ failure: 'server' });
    await expect(getList()).rejects.toMatchObject({ kind: 'http', status: 500 });
  });

  it('fails at the network level when the Dev Panel forces a network failure', async () => {
    setDevControls({ failure: 'network' });
    await expect(getList()).rejects.toMatchObject({ kind: 'network' });
  });

  it('returns an empty page when the Dev Panel forces an empty list', async () => {
    setDevControls({ emptyList: true });
    await expect(getList()).resolves.toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });
});

describe('GET /api/applications/:id', () => {
  it('returns the full record', async () => {
    await expect(getDetail(openApp.id)).resolves.toMatchObject({
      id: openApp.id,
      version: openApp.version,
    });
  });

  it('returns 404 for an unknown id', async () => {
    await expect(getDetail('app-999')).rejects.toMatchObject({ kind: 'http', status: 404 });
  });
});

describe('POST /api/applications/:id/review', () => {
  it('records the decision and returns the updated record', async () => {
    const saved = await postReview(openApp.id, {
      version: openApp.version,
      review: { decision: 'reject', reason: 'Premis di zon kediaman' },
    });
    expect(saved).toMatchObject({ status: 'rejected', version: openApp.version + 1 });
  });

  it('answers 422 with field error codes for an invalid body', async () => {
    await expect(
      postReview(openApp.id, {
        version: openApp.version,
        review: { decision: 'reject', reason: 'short' },
      }),
    ).rejects.toMatchObject({ kind: 'validation', fieldErrors: { reason: ['reason_too_short'] } });
  });

  it('keys a nested field error by its top-level field', async () => {
    const error: unknown = await postReview(openApp.id, {
      version: openApp.version,
      review: {
        decision: 'request_info',
        requestedInfo: ['not_a_document'],
        note: 'Tolong hantar',
      },
    }).catch((e: unknown) => e);
    if (!(error instanceof ApiError)) throw new Error('Expected an ApiError');
    expect(error.kind).toBe('validation');
    expect(Object.keys(error.fieldErrors)).toEqual(['requestedInfo']);
  });

  it('answers 409 when the version is stale', async () => {
    await expect(
      // A future version is just as stale; version - 1 could be 0, which fails validation (422) instead.
      postReview(openApp.id, {
        version: openApp.version + 1,
        review: { decision: 'approve', note: '' },
      }),
    ).rejects.toMatchObject({ kind: 'conflict', status: 409 });
  });

  it('answers 409 once when the Dev Panel forces a conflict, then switches itself off', async () => {
    setDevControls({ conflictNext: true });
    await expect(
      postReview(openApp.id, {
        version: openApp.version,
        review: { decision: 'approve', note: '' },
      }),
    ).rejects.toMatchObject({ kind: 'conflict' });
    expect(getDevControls().conflictNext).toBe(false);
  });

  it('honours the Dev Panel failure setting', async () => {
    setDevControls({ failure: 'server' });
    await expect(
      postReview(openApp.id, {
        version: openApp.version,
        review: { decision: 'approve', note: '' },
      }),
    ).rejects.toMatchObject({ kind: 'http', status: 500 });
  });
});
