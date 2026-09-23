import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { architecture } from '../content/architecture';
import { blobUrl } from '../source/repo';
import { Component as ArchitectureRoute } from './ArchitectureRoute';

const routes = [{ path: '/about/architecture', Component: ArchitectureRoute }];

describe('ArchitectureRoute', () => {
  it('shows the layer diagram as a figure named by its text alternative', () => {
    renderRoutes(routes, { initialEntries: ['/about/architecture'] });

    expect(screen.getByRole('figure', { name: /Four layers/ })).toBeInTheDocument();
  });

  it('shows the four layers, in order, as headings', () => {
    renderRoutes(routes, { initialEntries: ['/about/architecture'] });

    const figure = screen.getByRole('figure', { name: /Four layers/ });
    const headings = within(figure).getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      architecture.layers.en.map((layer) => layer.name),
    );
  });

  it('shows the trace as an ordered list of 5 steps, each linking to its file on GitHub', () => {
    renderRoutes(routes, { initialEntries: ['/about/architecture'] });

    const list = screen.getByRole('list', { name: architecture.trace.title.en });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);

    architecture.trace.steps.en.forEach((step, index) => {
      const link = within(items[index]!).getByRole('link', { name: /View on GitHub/ });
      expect(link).toHaveAttribute('href', blobUrl(step.path));
    });
  });
});
