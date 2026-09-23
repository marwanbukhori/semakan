import { renderHook, waitFor } from '@testing-library/react';
import { setDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { DEFAULT_LIST_PARAMS } from '../schemas';
import { useApplications } from './queries';

describe('useApplications', () => {
  it('loads the page of applications for the given filters', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useApplications({ ...DEFAULT_LIST_PARAMS, status: 'rejected' }),
      { wrapper: Wrapper },
    );

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.every((item) => item.status === 'rejected')).toBe(true);
  });

  it('keeps the previous page on screen while the next page loads', async () => {
    const { Wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useApplications({ ...DEFAULT_LIST_PARAMS, page }),
      { wrapper: Wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPage = result.current.data;

    rerender({ page: 2 });

    expect(result.current.data).toBe(firstPage);
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data?.page).toBe(2));
  });

  it('exposes an ApiError when the server fails', async () => {
    setDevControls({ failure: 'server' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplications(DEFAULT_LIST_PARAMS), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ kind: 'http', status: 500 });
  });
});
