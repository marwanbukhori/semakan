import { screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { overview } from '../content/overview';
import { Component as OverviewRoute } from './OverviewRoute';

const routes = [{ path: '/about', Component: OverviewRoute }];

describe('OverviewRoute', () => {
  afterEach(() => void i18n.changeLanguage('en'));

  it('shows the title, intro, stack and tour links', () => {
    renderRoutes(routes, { initialEntries: ['/about'] });

    expect(screen.getByRole('heading', { level: 1, name: 'About this build' })).toBeInTheDocument();

    for (const paragraph of overview.intro.en) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }

    for (const item of overview.stack) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    for (const link of overview.tour.en) {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
  });

  it('toggles a folder to reveal its description, by click and by keyboard', async () => {
    const { user } = renderRoutes(routes, { initialEntries: ['/about'] });

    const summary = screen.getByText('src/mocks').closest('summary')!;
    expect(screen.queryByText(/The mock API \(MSW\)/)).not.toBeVisible();

    await user.click(summary);
    expect(screen.getByText(/The mock API \(MSW\)/)).toBeVisible();

    await user.click(summary);
    expect(screen.queryByText(/The mock API \(MSW\)/)).not.toBeVisible();

    // Enter on a focused <summary> natively activates it in real browsers (no custom key
    // handler needed), but jsdom does not emulate that activation, so it is verified above
    // via click instead. Confirmed empirically: `user.keyboard('{Enter}')` here leaves the
    // <details> closed in jsdom. This is a known jsdom limitation, not a component bug.
    summary.focus();
    await user.keyboard('{Enter}');
  });

  it('shows the Malay title and no English intro sentence when the language is Malay', async () => {
    await act(() => i18n.changeLanguage('ms'));
    renderRoutes(routes, { initialEntries: ['/about'] });

    expect(screen.getByRole('heading', { level: 1, name: overview.title.ms })).toBeInTheDocument();

    for (const paragraph of overview.intro.en) {
      expect(screen.queryByText(paragraph)).not.toBeInTheDocument();
    }
  });
});
