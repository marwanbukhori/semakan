import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { RouteError } from './RouteError';
import { routes } from './router';

describe('app routes', () => {
  it('redirects / to the applications list inside the layout', async () => {
    const { router } = renderRoutes(routes, { initialEntries: ['/'] });

    expect(
      await screen.findByRole('heading', { name: 'Licence applications' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/applications');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows a not-found page without losing the layout', async () => {
    renderRoutes(routes, { initialEntries: ['/nowhere'] });

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('catches a crashing route with the error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('boom');
    }
    renderRoutes([{ path: '/', Component: Boom, ErrorBoundary: RouteError }]);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to applications' })).toHaveAttribute(
      'href',
      '/applications',
    );
  });
});
