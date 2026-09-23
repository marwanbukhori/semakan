import { renderHook, waitFor } from '@testing-library/react';
import { setDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { pinDate, unpinDate } from '@/test/time';
import { useFuelPrices } from './queries';

describe('useFuelPrices', () => {
  beforeEach(() => pinDate('2026-09-25T00:00:00.000Z'));
  afterEach(unpinDate);

  it('loads validated price levels for the chosen range', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFuelPrices('3m'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const levels = result.current.data?.levels ?? [];
    expect(levels.length).toBeGreaterThan(10);
    expect(levels[0]!.date >= '2026-06-25').toBe(true);
    expect(result.current.data?.meta.data_source).toContain('MOF');
  });

  it('surfaces a rate limit as an http 429 ApiError without retrying', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFuelPrices('6m'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ kind: 'http', status: 429 });
  });
});
