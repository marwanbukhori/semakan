import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { REQUIREMENTS } from '../content/requirements';
import { Component as ExperienceRoute } from './ExperienceRoute';

const routes = [{ path: '/about/experience', Component: ExperienceRoute }];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mounting this page (7 project cards plus a 14–15 row table) is enough content that React 19's
 * scheduler sometimes finishes committing it a macrotask or two after the synchronous mount
 * `render()`/`act()` call returns — with no interaction of ours involved, this shows up even on a
 * plain first render. Rather than let that trailing, harmless commit (the DOM already shows the
 * intended, fully-rendered result by the time every assertion below passes) print React's own
 * "not wrapped in act" warning from wherever it happens to land — sometimes mid-test, sometimes
 * only once the tree unmounts — every test in this file runs its body through here: giving the
 * scheduler a few real ticks to settle, then forcing the unmount early (`cleanup()`; RTL runs it
 * again, harmlessly, in `src/test/setup.ts`'s own `afterEach`), all while filtering just that one
 * console message.
 */
async function withSettledRender<T>(run: () => T | Promise<T>): Promise<T> {
  const originalError = console.error.bind(console);
  const consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation((message: unknown, ...rest: unknown[]) => {
      if (typeof message === 'string' && message.includes('was not wrapped in act')) return;
      originalError(message, ...rest);
    });
  try {
    const result = await run();
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await tick();
    }
    cleanup();
    return result;
  } finally {
    consoleError.mockRestore();
  }
}

/**
 * Presses and releases an arrow key on the focused radio, then waits for `settled` to become
 * true.
 *
 * MYDS's Radio (Radix's roving focus group) moves focus and selects the next item from a
 * `setTimeout(0)` queued by its own keydown handler. `userEvent.keyboard` fires keydown and keyup
 * back to back without yielding a macrotask in between, so the deferred focus/select would land
 * after its own keyup had already reset Radix's "arrow key held" flag — holding the key down,
 * waiting a real tick, then releasing reproduces what a real keypress does instead (keydown, then
 * focus moves, then keyup much later).
 *
 * Everything — the held key, that deferred focus/select, and the resulting `setRole` — stays
 * inside one continuous `act`, not several back-to-back ones: React only treats updates as
 * "acting" while this callback's returned promise is still pending, so a gap between separate
 * `act` calls is exactly where an update driven by React's own scheduler (not by an event we
 * fired) could land unwrapped. `settled` is polled with the same real timer so it catches however
 * many ticks the resulting navigation actually takes.
 */
async function pressArrowKey(key: 'ArrowDown' | 'ArrowRight', settled: () => boolean) {
  const focused = document.activeElement!;
  await act(async () => {
    fireEvent.keyDown(focused, { key });
    await tick();
    fireEvent.keyUp(document.activeElement!, { key });
    for (let attempt = 0; attempt < 200 && !settled(); attempt += 1) {
      await tick();
    }
  });
}

describe('ExperienceRoute', () => {
  afterEach(() => void i18n.changeLanguage('en'));

  it('defaults to the backend role', () =>
    withSettledRender(() => {
      renderRoutes(routes, { initialEntries: ['/about/experience'] });

      expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Backend role' })).toBeChecked();

      const cards = screen.getAllByRole('article');
      expect(within(cards[0]!).getByRole('heading', { level: 3 }).textContent).toBe(
        'E-Invoice System (EIS)',
      );
      expect(within(cards[0]!).getAllByRole('heading', { level: 4 })[0]!.textContent).toBe(
        'Backend',
      );

      const map = screen.getByRole('table');
      expect(screen.getByText('Requirements for the backend role')).toBeInTheDocument();
      expect(within(map).getAllByRole('row')).toHaveLength(15 + 1); // +1 header row

      const typedServicesRow = within(map)
        .getByText('Backend services in a statically typed language (Go, TypeScript or Python)')
        .closest('tr')!;
      expect(within(typedServicesRow).getByText('Planned · Plan 6')).toBeInTheDocument();
    }));

  it('switches to the frontend role with the arrow key on the radio group', () =>
    withSettledRender(async () => {
      const { router } = renderRoutes(routes, { initialEntries: ['/about/experience'] });

      const checked = screen.getByRole('radio', { checked: true });
      checked.focus();
      // Settled means the DOM itself reflects the new role, i.e. React has actually committed the
      // re-render (not just that react-router's internal state object has updated, which happens
      // a little earlier).
      await pressArrowKey(
        'ArrowDown',
        () =>
          screen.queryByRole('radio', { name: 'Frontend role' })?.getAttribute('aria-checked') ===
          'true',
      );

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
      const noFrontendIndex = cardNames.indexOf('RON95 subsidy and POS features');
      const hasFrontendIndex = cardNames.indexOf('E-Invoice System (EIS)');
      expect(noFrontendIndex).toBeGreaterThan(hasFrontendIndex);
      const ron95Card = cards[noFrontendIndex]!;
      expect(within(ron95Card).getByText('No frontend work on this project.')).toBeInTheDocument();
    }));

  it('links past-work cells to project card anchors that exist on the page', () =>
    withSettledRender(() => {
      renderRoutes(routes, { initialEntries: ['/about/experience'] });

      const map = screen.getByRole('table');
      const links = within(map).getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href?.startsWith('#project-')) continue;
        expect(document.querySelector(href)).not.toBeNull();
      }
    }));

  it('shows Malay headings when the language is Malay', () =>
    withSettledRender(async () => {
      await act(() => i18n.changeLanguage('ms'));
      renderRoutes(routes, { initialEntries: ['/about/experience'] });

      expect(screen.getByRole('heading', { level: 1, name: 'Pengalaman' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Peta keperluan' })).toBeInTheDocument();
    }));

  it('has 14 frontend and 15 backend requirements', () => {
    expect(REQUIREMENTS.filter((requirement) => requirement.role === 'frontend')).toHaveLength(14);
    expect(REQUIREMENTS.filter((requirement) => requirement.role === 'backend')).toHaveLength(15);
  });
});
