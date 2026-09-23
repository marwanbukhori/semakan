import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/app/providers';

/** Tests fail fast: no retries, so error states appear immediately. */
const createTestQueryClient = () => createQueryClient({ queries: { retry: false } });

export function renderRoutes(
  routes: RouteObject[],
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {},
) {
  const router = createMemoryRouter(routes, { initialEntries });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, user, router, queryClient };
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}
