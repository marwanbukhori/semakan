import { act, screen, within } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { REQUIREMENTS } from '../content/requirements';
import { Component as ExperienceRoute } from './ExperienceRoute';

const routes = [{ path: '/about/experience', Component: ExperienceRoute }];

describe('ExperienceRoute', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it('defaults to the backend role', () => {
    renderRoutes(routes, { initialEntries: ['/about/experience'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Backend role' })).toBeChecked();

    const cards = screen.getAllByRole('article');
    const cardNames = cards.map(
      (card) => within(card).getByRole('heading', { level: 3 }).textContent,
    );
    expect(cardNames).toEqual([
      'E-Invoice System (EIS)',
      'Rembayung booking queue',
      'CloudBOS reporting',
      'RON95 subsidy and POS features',
      'Security hardening',
      'Python services',
      'Verus Virtus company site',
    ]);
    expect(within(cards[0]!).getAllByRole('heading', { level: 4 })[0]!.textContent).toBe('Backend');

    const map = screen.getByRole('table');
    expect(screen.getByText('Requirements for the backend role')).toBeInTheDocument();
    expect(within(map).getAllByRole('row')).toHaveLength(15 + 1); // +1 header row

    const typedServicesRow = within(map)
      .getByText('Backend services in a statically typed language (Go, TypeScript or Python)')
      .closest('tr')!;
    expect(within(typedServicesRow).getByText('Planned · Plan 6')).toBeInTheDocument();
  });

  it('switches to the frontend role with the arrow key on the radio group', async () => {
    const { user, router } = renderRoutes(routes, { initialEntries: ['/about/experience'] });

    const checked = screen.getByRole('radio', { name: 'Backend role' });
    for (let tabs = 0; tabs < 10 && document.activeElement !== checked; tabs += 1) {
      await user.tab();
    }
    expect(checked).toHaveFocus();

    await user.keyboard('{ArrowDown>}');
    await screen.findByRole('radio', { name: 'Frontend role', checked: true });
    await user.keyboard('{/ArrowDown}');

    expect(router.state.location.search).toBe('?role=frontend');
    expect(screen.getByRole('radio', { name: 'Frontend role' })).toBeChecked();

    const map = screen.getByRole('table');
    expect(within(map).getAllByRole('row')).toHaveLength(14 + 1);
    const e2eRow = within(map).getByText('End-to-end testing (Playwright)').closest('tr')!;
    expect(within(e2eRow).getByText('Planned · Plan 4')).toBeInTheDocument();

    const cards = screen.getAllByRole('article');
    const cardNames = cards.map(
      (card) => within(card).getByRole('heading', { level: 3 }).textContent,
    );
    expect(cardNames).toEqual([
      'E-Invoice System (EIS)',
      'Verus Virtus company site',
      'Rembayung booking queue',
      'CloudBOS reporting',
      'RON95 subsidy and POS features',
      'Security hardening',
      'Python services',
    ]);
    const ron95Card = cards[cardNames.indexOf('RON95 subsidy and POS features')]!;
    expect(within(ron95Card).getByText('No frontend work on this project.')).toBeInTheDocument();
  });

  it('links past-work cells to project card anchors that exist on the page', () => {
    renderRoutes(routes, { initialEntries: ['/about/experience'] });

    const map = screen.getByRole('table');
    const links = within(map).getAllByRole('link');
    const projectLinks = links.filter((link) => link.getAttribute('href')?.startsWith('#project-'));
    expect(projectLinks.length).toBeGreaterThan(0);
    for (const link of projectLinks) {
      expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull();
    }
  });

  it('shows Malay headings when the language is Malay', async () => {
    await act(() => i18n.changeLanguage('ms'));
    renderRoutes(routes, { initialEntries: ['/about/experience'] });

    expect(screen.getByRole('heading', { level: 1, name: 'Pengalaman' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Projek' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Peta keperluan' })).toBeInTheDocument();
  });

  it('has 14 frontend and 15 backend requirements', () => {
    expect(REQUIREMENTS.filter((requirement) => requirement.role === 'frontend')).toHaveLength(14);
    expect(REQUIREMENTS.filter((requirement) => requirement.role === 'backend')).toHaveLength(15);
  });
});
