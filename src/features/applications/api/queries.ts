import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { ApplicationDetailSchema, ApplicationListSchema } from '../schemas';
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

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: ({ signal }) =>
      apiClient.get(`/applications/${encodeURIComponent(id)}`, ApplicationDetailSchema, { signal }),
  });
}
