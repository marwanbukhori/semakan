import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/app/providers';
import { isReviewable } from '@/features/applications/rules';
import {
  applyReview,
  requiresFireCertificate,
  seedApplicationDetails,
} from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { server } from '@/mocks/node';
import { createWrapper } from '@/test/render';
import { DEFAULT_LIST_PARAMS } from '../schemas';
import type { ApplicationDetail, ApplicationList, ReviewRequest } from '../types';
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

  it('sends If-Match with the request version and a UUID Idempotency-Key', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    let seenHeaders: Headers | undefined;
    const onRequestStart = ({ request }: { request: Request }) => {
      if (request.url.includes('/review')) seenHeaders = request.headers;
    };
    server.events.on('request:start', onRequestStart);

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isSuccess).toBe(true));
    server.events.removeListener('request:start', onRequestStart);

    expect(seenHeaders?.get('If-Match')).toBe(`"${target.version}"`);
    expect(seenHeaders?.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('reuses the same Idempotency-Key when a retry re-invokes mutationFn', async () => {
    // A mutation-level retry is opt-in for this test only: the app itself runs with
    // mutations.retry: false, so mutationFn normally never re-runs for the same submission.
    const queryClient = createQueryClient({ mutations: { retry: 1 } });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () => ({
        detail: useApplication(target.id),
        review: useReviewApplication(target.id),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    const seenKeys: (string | null)[] = [];
    let attempt = 0;
    server.use(
      http.post('/api/applications/:id/review', async ({ params, request }) => {
        attempt += 1;
        seenKeys.push(request.headers.get('Idempotency-Key'));
        // Fail the first attempt with a network error; the retry applies the review for real
        // (mirroring the default handler), so the mutation still resolves successfully.
        if (attempt === 1) return HttpResponse.error();
        const body = (await request.json()) as ReviewRequest;
        const outcome = applyReview(String(params.id), body);
        if (outcome.kind !== 'ok') throw new Error(`Unexpected review outcome: ${outcome.kind}`);
        return HttpResponse.json(outcome.detail);
      }),
    );

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isSuccess).toBe(true), { timeout: 3000 });

    expect(seenKeys).toHaveLength(2);
    expect(seenKeys[0]).not.toBeNull();
    expect(seenKeys[0]).toBe(seenKeys[1]);
    expect(seenKeys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
