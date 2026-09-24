import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutateAsyncFunction,
  type UseMutateFunction,
} from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { statusAfterDecision } from '../rules';
import { ApplicationDetailSchema } from '../schemas';
import type { ApplicationDetail, ApplicationList, ReviewRequest } from '../types';
import { applicationKeys } from './keys';

type ReviewContext = {
  previousDetail: ApplicationDetail | undefined;
  previousLists: [QueryKey, ApplicationList | undefined][];
};

// TanStack re-invokes mutationFn on every retry, so an Idempotency-Key generated inside
// mutationFn would change on each retry. Instead it is generated once, at submit time, and
// carried as part of the mutation's variables: retries reuse the same variables, so the same
// key. `mutate`/`mutateAsync` below add it to the caller's ReviewRequest; mutationFn just reads it.
type ReviewVariables = ReviewRequest & { idempotencyKey: string };

export function useReviewApplication(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApplicationDetail, Error, ReviewVariables, ReviewContext>({
    mutationFn: ({ idempotencyKey, ...request }) =>
      apiClient.post(
        `/applications/${encodeURIComponent(id)}/review`,
        ApplicationDetailSchema,
        request,
        {
          headers: {
            'If-Match': `"${request.version}"`,
            'Idempotency-Key': idempotencyKey,
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

  // The hook exposes the same API as useMutation would with `ReviewRequest` variables: these
  // wrappers add the Idempotency-Key once per call, before handing off to the underlying
  // mutation (whose variables type also carries the key).
  const mutate: UseMutateFunction<ApplicationDetail, Error, ReviewRequest, ReviewContext> = (
    request,
    options,
  ) => {
    mutation.mutate({ ...request, idempotencyKey: crypto.randomUUID() }, options);
  };

  const mutateAsync: UseMutateAsyncFunction<
    ApplicationDetail,
    Error,
    ReviewRequest,
    ReviewContext
  > = (request, options) =>
    mutation.mutateAsync({ ...request, idempotencyKey: crypto.randomUUID() }, options);

  return { ...mutation, mutate, mutateAsync };
}
