import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { Component as AboutLayout } from './AboutLayout';

const routes = [
  {
    path: '/about',
    Component: AboutLayout,
    children: [
      { index: true, element: <h1>Overview page</h1> },
      { path: 'practices', element: <h1>Practices page</h1> },
    ],
  },
];

describe('AboutLayout', () => {
  it('links every about section and marks the current one', async () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const nav = await screen.findByRole('navigation', { name: 'About this build' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Overview',
      'Architecture',
      'Practices',
      'Experience',
      'AI workflow',
    ]);
    expect(within(nav).getByRole('link', { name: 'Practices' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { level: 1, name: 'Practices page' })).toBeInTheDocument();
  });
});
