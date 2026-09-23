import { ThemeProvider } from '@govtechmy/myds-react/hooks';
import { QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
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

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [initialTheme] = useState(readStoredTheme);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme={initialTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
