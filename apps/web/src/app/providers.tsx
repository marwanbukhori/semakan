import { ThemeProvider } from '@govtechmy/myds-react/hooks';
import { QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getDevControls, subscribeDevControls } from '@/mocks/devControls';
import { setApiBaseUrl } from '@/shared/api/client';
import { shouldRetryQuery } from '@/shared/api/retry';

export function createQueryClient(overrides: DefaultOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetryQuery, staleTime: 30_000, ...overrides.queries },
      mutations: { retry: false, ...overrides.mutations },
    },
  });
}

function readStoredTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// #region practice:dev-panel-api-source
// Shared code must not import mocks (boundaries lint rule), so the app layer is where the Dev
// Panel's API source setting is turned into an actual base URL change. This lives in
// AppProviders (rather than AppLayout or main.tsx) because that's where the QueryClient used by
// queryClient.resetQueries() is created.
function resolveApiBaseUrl(apiSource: ReturnType<typeof getDevControls>['apiSource']): string {
  // Ignored in production builds (the switch isn't rendered there): always the mock API.
  return import.meta.env.DEV && apiSource === 'real' ? '/api/v1' : '/api';
}

function useApiSource(queryClient: QueryClient): void {
  const apiSource = useSyncExternalStore(subscribeDevControls, () => getDevControls().apiSource);
  const isFirstRun = useRef(true);

  useEffect(() => {
    setApiBaseUrl(resolveApiBaseUrl(apiSource));
    // Switching source resets every cached response back to its initial state (mock and real
    // data never mix), and refetches whatever is still mounted so the screen catches up.
    // queryClient.clear() would remove queries outright, which leaves a still-mounted
    // useQuery observer stuck showing its last (stale) result: TanStack only auto-refetches
    // an active query on mount or invalidation, not merely because the cache was cleared out
    // from under it. resetQueries() resets the data *and* refetches active queries.
    // Skip it on mount, since there is nothing cached yet to reset.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    void queryClient.resetQueries();
  }, [apiSource, queryClient]);
}
// #endregion

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [initialTheme] = useState(readStoredTheme);
  useApiSource(queryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme={initialTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
