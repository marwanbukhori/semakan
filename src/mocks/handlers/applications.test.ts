import { ApplicationListSchema } from '@/features/applications/schemas';
import { apiClient } from '@/shared/api/client';
import { setDevControls } from '../devControls';

const getList = (params: Record<string, string> = {}) =>
  apiClient.get('/applications', ApplicationListSchema, { params });

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
