import { act, renderHook } from '@testing-library/react';
import { useDebouncedCallback } from './useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls once, with the latest arguments, after the delay', () => {
    const spy = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, 300));

    act(() => {
      result.current('k');
      result.current('ke');
      result.current('ked');
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ked');
  });

  it('uses the latest callback without resetting the timer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, 300), {
      initialProps: { cb: first },
    });

    act(() => result.current('x'));
    rerender({ cb: second });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('x');
  });

  it('does not fire after unmount', () => {
    const spy = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 300));

    act(() => result.current('x'));
    unmount();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
