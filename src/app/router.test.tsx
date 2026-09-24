import { screen, waitFor } from '@testing-library/react';
import { isReviewable } from '@/features/applications/rules';
import { seedApplicationDetails } from '@/mocks/db/applications';
import { renderRoutes } from '@/test/render';
import { pinDate, unpinDate } from '@/test/time';
import { RouteError } from './RouteError';
import { createRoutes } from './router';

describe('app routes', () => {
  it('redirects / to the about pages', async () => {
    const { router } = renderRoutes(createRoutes(), { initialEntries: ['/'] });
    expect(await screen.findByRole('navigation', { name: 'About this build' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/about');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('links the app name in the header to the applications list', async () => {
    const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/about'] });
    await user.click(
      await screen.findByRole('link', { name: /^Semakan\s*Licence application review$/ }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/applications'));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /^Semakan/ })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
  });

  it('links to the about pages from the header', async () => {
    const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });
    await user.click(await screen.findByRole('link', { name: 'About this build' }));
    expect(router.state.location.pathname).toBe('/about');
  });

  it('shows a not-found page without losing the layout', async () => {
    renderRoutes(createRoutes(), { initialEntries: ['/nowhere'] });

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('opens an application from the list', async () => {
    const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });
    const [firstLink] = await screen.findAllByRole('link', { name: /^LPP-2026-/ });

    await user.click(firstLink!);

    expect(
      await screen.findByRole('heading', { level: 1, name: firstLink!.textContent ?? '' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/applications\/app-\d{3}$/);
  });

  it('catches a crashing route with the error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('boom');
    }
    renderRoutes([{ path: '/', Component: Boom, ErrorBoundary: RouteError }]);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    // The raw error text is a developer aid: shown in development only.
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to applications' })).toHaveAttribute(
      'href',
      '/applications',
    );
  });

  it('hides the raw error detail outside development', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('DEV', false);
    function Boom(): never {
      throw new Error('boom');
    }
    try {
      renderRoutes([{ path: '/', Component: Boom, ErrorBoundary: RouteError }]);

      expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('boom')).not.toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('opens the review dialog from the detail page', async () => {
    const reviewable = seedApplicationDetails().find((d) => isReviewable(d.status))!;
    const { user, router } = renderRoutes(createRoutes(), {
      initialEntries: [`/applications/${reviewable.id}`],
    });

    await user.click(await screen.findByRole('link', { name: 'Review application' }));

    expect(
      await screen.findByRole('dialog', { name: `Review ${reviewable.referenceNo}` }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/applications/${reviewable.id}/review`);
  });
});

describe('app routes to open data', () => {
  beforeEach(() => pinDate('2026-09-25T00:00:00.000Z'));
  afterEach(unpinDate);

  it('reaches the fuel prices page from the header', async () => {
    const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });

    await user.click(await screen.findByRole('link', { name: 'Fuel prices' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fuel prices' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/open-data/fuel-prices');
  });
});
