import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { ApplicationListSchema } from '../schemas';
import type { ApplicationListParams } from '../types';
import { applicationKeys } from './keys';

export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: ({ signal }) =>
      apiClient.get('/applications', ApplicationListSchema, { params, signal }),
    // Keep the current page visible while the next one loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}
