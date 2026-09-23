import { redirect, type RouteObject } from 'react-router';
import { AppLayout } from './AppLayout';
import { NotFound } from './NotFound';
import { PageSpinner } from './PageSpinner';
import { RouteError } from './RouteError';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary: RouteError,
    HydrateFallback: PageSpinner,
    children: [
      // Component keeps this a normal element route (not loader-only), so react-router
      // doesn't warn that the matched leaf has nothing to render while the redirect resolves.
      { index: true, Component: PageSpinner, loader: () => redirect('/applications') },
      {
        path: 'applications',
        // A crash inside a page is caught here, so the header and nav stay usable.
        ErrorBoundary: RouteError,
        lazy: {
          Component: async () =>
            (await import('@/features/applications/routes/ListRoute')).Component,
        },
      },
      { path: '*', Component: NotFound },
    ],
  },
];
