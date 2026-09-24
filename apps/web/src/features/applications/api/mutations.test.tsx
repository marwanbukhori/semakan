import { act, renderHook, waitFor } from '@testing-library/react';
import { isReviewable } from '@/features/applications/rules';
import { requiresFireCertificate, seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { DEFAULT_LIST_PARAMS } from '../schemas';
import type { ApplicationDetail, ApplicationList } from '../types';
import { applicationKeys } from './keys';
import { useReviewApplication } from './mutations';
import { useApplication, useApplications } from './queries';

const target = seedApplicationDetails().find(
  (d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory),
)!;

function setup() {
  const { Wrapper, queryClient } = createWrapper();
  const hook = renderHook(
    () => ({
      detail: useApplication(target.id),
      list: useApplications({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
      review: useReviewApplication(target.id),
    }),
    { wrapper: Wrapper },
  );
  return { ...hook, queryClient };
}

const rejectRequest = () => ({
  version: target.version,
  review: { decision: 'reject' as const, reason: 'Premis di zon kediaman' },
});

describe('useReviewApplication', () => {
  it('shows the new status immediately, before the server answers', async () => {
    const { result, queryClient } = setup();
    await waitFor(() =>
      expect(result.current.detail.isSuccess && result.current.list.isSuccess).toBe(true),
    );
    setDevControls({ latencyMs: 800 });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() =>
      expect(
        queryClient.getQueryData<ApplicationDetail>(applicationKeys.detail(target.id))?.status,
      ).toBe('rejected'),
    );
    expect(result.current.review.isPending).toBe(true);
    const list = queryClient.getQueryData<ApplicationList>(
      applicationKeys.list({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
    );
    expect(list?.items[0]?.status).toBe('rejected');

    await waitFor(() => expect(result.current.review.isSuccess).toBe(true), { timeout: 3000 });
    expect(result.current.review.data?.version).toBe(target.version + 1);
  });

  it('rolls back the optimistic status when the server fails', async () => {
    const { result, queryClient } = setup();
    await waitFor(() =>
      expect(result.current.detail.isSuccess && result.current.list.isSuccess).toBe(true),
    );
    setDevControls({ failure: 'server' });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isError).toBe(true));
    expect(
      queryClient.getQueryData<ApplicationDetail>(applicationKeys.detail(target.id))?.status,
    ).toBe(target.status);
    const list = queryClient.getQueryData<ApplicationList>(
      applicationKeys.list({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
    );
    expect(list?.items[0]?.status).toBe(target.status);
  });

  it('surfaces a conflict as an ApiError of kind "conflict"', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    setDevControls({ conflictNext: true });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isError).toBe(true));
    expect(result.current.review.error).toMatchObject({ kind: 'conflict' });
  });
});
