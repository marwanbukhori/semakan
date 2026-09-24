import { act, screen, within } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { PRACTICES } from '../content/practices';
import { Component as PracticesRoute } from './PracticesRoute';

const routes = [{ path: '/about/practices', Component: PracticesRoute }];

describe('PracticesRoute', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it('shows the title and intro', () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Practices' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Each practice shows where it lives in the code and what keeps it true. Partial and planned items say so.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a summary line with counts computed from the content', () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const enforced = PRACTICES.filter((practice) => practice.status === 'enforced').length;
    const partial = PRACTICES.filter((practice) => practice.status === 'partial').length;
    const planned = PRACTICES.filter((practice) => practice.status === 'planned').length;

    expect(
      screen.getByText(`${enforced} enforced · ${partial} partial · ${planned} planned`),
    ).toBeInTheDocument();
  });

  it('shows one article per practice, each labelled by its heading', () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(PRACTICES.length);

    for (const [index, practice] of PRACTICES.entries()) {
      expect(
        within(articles[index]!).getByRole('heading', { name: practice.title.en }),
      ).toBeInTheDocument();
    }
  });

  it('shows the validate-at-boundary excerpt with schema.safeParse and a link to its lines', async () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const article = screen.getByRole('article', {
      name: 'Validate every response at the boundary',
    });
    expect(await within(article).findByText(/schema\.safeParse/)).toBeInTheDocument();
    const link = within(article).getByRole('link', { name: /View on GitHub/ });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/marwanbukhori\/semakan\/blob\/main\/apps\/web\/src\/shared\/api\/client\.ts#L\d+-L\d+$/,
    );
  });

  it('shows "Partial" and "Plan 4" for a partial practice that has a plan', () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const article = screen.getByRole('article', { name: 'Composition over configuration' });
    expect(within(article).getByText(/Partial/)).toBeInTheDocument();
    expect(within(article).getByText(/Plan 4/)).toBeInTheDocument();
  });

  it('shows the Malay title and status words when the language is Malay', async () => {
    await act(() => i18n.changeLanguage('ms'));
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Amalan' })).toBeInTheDocument();
    expect(screen.getAllByText('Dikuatkuasakan').length).toBeGreaterThan(0);
  });
});
