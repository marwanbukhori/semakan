import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { rangeStart } from '../ranges';
import { FuelPriceResponseSchema } from '../schemas';
import type { FuelRange } from '../types';
import { dataGovClient } from './client';
import { openDataKeys } from './keys';

export function useFuelPrices(range: FuelRange) {
  const dateStart = rangeStart(range);
  return useQuery({
    queryKey: openDataKeys.fuelPrices(range, dateStart),
    queryFn: ({ signal }) =>
      // The trailing slash matters: without it data.gov.my answers with a redirect.
      dataGovClient.get('/data-catalogue/', FuelPriceResponseSchema, {
        params: { id: 'fuelprice', date_start: `${dateStart}@date`, sort: 'date', meta: 'true' },
        signal,
      }),
    placeholderData: keepPreviousData,
    // Weekly data: no point refetching before the publisher's next scheduled update.
    staleTime: (query) => {
      const nextUpdate = query.state.data?.meta.next_update;
      return nextUpdate ? Math.max(0, Date.parse(nextUpdate) - Date.now()) : 0;
    },
  });
}
