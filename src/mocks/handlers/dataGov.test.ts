import { getDevControls, setDevControls } from '../devControls';
import { DATA_GOV_CATALOGUE_URL } from './dataGov';

const get = (query: string) => fetch(`${DATA_GOV_CATALOGUE_URL}?${query}`);

describe('data.gov.my mock', () => {
  it('serves recorded data by default in tests, never the live API', async () => {
    expect(getDevControls().dataGov).toBe('fixture');
    const response = await get('id=fuelprice&meta=true');
    const body = (await response.json()) as { meta: { catalogue_id: string }; data: unknown[] };
    expect(response.status).toBe(200);
    expect(body.meta.catalogue_id).toBe('fuelprice');
    expect(body.data.length).toBeGreaterThan(80);
  });

  it('filters the recording by date_start and date_end', async () => {
    const response = await get(
      'id=fuelprice&meta=true&date_start=2026-08-01%40date&date_end=2026-08-31%40date',
    );
    const body = (await response.json()) as { data: { date: string }[] };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((row) => row.date >= '2026-08-01' && row.date <= '2026-08-31')).toBe(
      true,
    );
  });

  it("answers an unknown dataset with data.gov.my's 404 shape", async () => {
    const response = await get('id=nope');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ status_code: 404 });
  });

  it('can force a rate limit, a missing dataset or an offline network', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    expect((await get('id=fuelprice')).status).toBe(429);

    setDevControls({ dataGov: 'not_found' });
    expect((await get('id=fuelprice')).status).toBe(404);

    setDevControls({ dataGov: 'offline' });
    await expect(get('id=fuelprice')).rejects.toThrow();
  });
});
