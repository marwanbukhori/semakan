import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { statusAfterDecision } from '../rules';
import { ApplicationDetailSchema } from '../schemas';
import type { ApplicationDetail, ApplicationList, ReviewRequest } from '../types';
import { applicationKeys } from './keys';

type ReviewContext = {
  previousDetail: ApplicationDetail | undefined;
  previousLists: [QueryKey, ApplicationList | undefined][];
};

export function useReviewApplication(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDetail, Error, ReviewRequest, ReviewContext>({
    // Mutation retries are off (`mutations: { retry: false }` in app/providers.tsx), so
    // mutationFn runs at most once per mutate() call: the Idempotency-Key is naturally one per
    // submission, never regenerated for a retry.
    mutationFn: (request) =>
      apiClient.post(
        `/applications/${encodeURIComponent(id)}/review`,
        ApplicationDetailSchema,
        request,
        {
          headers: {
            'If-Match': `"${request.version}"`,
            'Idempotency-Key': crypto.randomUUID(),
          },
        },
      ),

    // #region practice:optimistic-rollback
    // Show the outcome straight away; the server's answer replaces or rolls it back.
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() });

      const previousDetail = queryClient.getQueryData<ApplicationDetail>(
        applicationKeys.detail(id),
      );
      const previousLists = queryClient.getQueriesData<ApplicationList>({
        queryKey: applicationKeys.lists(),
      });
      const status = statusAfterDecision(request.review.decision);

      queryClient.setQueryData<ApplicationDetail>(
        applicationKeys.detail(id),
        (old) => old && { ...old, status },
      );
      queryClient.setQueriesData<ApplicationList>(
        { queryKey: applicationKeys.lists() },
        (old) =>
          old && {
            ...old,
            items: old.items.map((item) => (item.id === id ? { ...item, status } : item)),
          },
      );

      return { previousDetail, previousLists };
    },

    // The onMutate result is the 3rd argument in TanStack Query v5.
    onError: (_error, _request, context) => {
      if (!context) return;
      queryClient.setQueryData(applicationKeys.detail(id), context.previousDetail);
      for (const [key, data] of context.previousLists) queryClient.setQueryData(key, data);
    },
    // #endregion

    onSuccess: (detail) => {
      queryClient.setQueryData(applicationKeys.detail(id), detail);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
