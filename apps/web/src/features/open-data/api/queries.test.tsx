import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/app/providers';
import { DATA_GOV_CATALOGUE_URL } from '@/mocks/handlers/dataGov';
import { server } from '@/mocks/node';
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
    let requests = 0;
    server.use(
      http.get(DATA_GOV_CATALOGUE_URL, () => {
        requests += 1;
        return HttpResponse.json(
          { status_code: 429, details: ['Too many requests'] },
          { status: 429 },
        );
      }),
    );
    // The production retry policy, with no back-off so any retry would happen within the test.
    const queryClient = createQueryClient({ queries: { retryDelay: 0 } });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(() => useFuelPrices('6m'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ kind: 'http', status: 429 });
    expect(requests).toBe(1);
  });
});
