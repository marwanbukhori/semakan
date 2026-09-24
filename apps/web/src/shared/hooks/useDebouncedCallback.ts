import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Returns `[debounced, cancel]`: `debounced` runs `callback` once calls have paused for
 * `delayMs`, and `cancel` drops a pending call. Both are stable across renders.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
): readonly [debounced: (...args: A) => void, cancel: () => void] {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const debounced = useCallback(
    (...args: A) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
  const cancel = useCallback(() => clearTimeout(timeoutRef.current), []);

  return [debounced, cancel] as const;
}
