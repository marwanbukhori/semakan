import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { useApplicationFilters } from './useApplicationFilters';

function Probe() {
  const { filters, setFilters, resetFilters } = useApplicationFilters();
  return (
    <>
      <output aria-label="filters">{JSON.stringify(filters)}</output>
      <button onClick={() => setFilters({ status: 'approved' })}>approve</button>
      <button onClick={() => setFilters({ page: 3 })}>page 3</button>
      <button onClick={resetFilters}>reset</button>
    </>
  );
}

const renderProbe = (url: string) =>
  renderRoutes([{ path: '/', Component: Probe }], { initialEntries: [url] });

const currentFilters = () =>
  JSON.parse(screen.getByRole('status', { name: 'filters' }).textContent ?? '') as unknown;

const searchOf = (router: ReturnType<typeof renderProbe>['router']) =>
  Object.fromEntries(new URLSearchParams(router.state.location.search));

describe('useApplicationFilters', () => {
  it('reads filters from the URL', () => {
    renderProbe('/?status=approved&page=2&sort=businessName&order=asc&q=kedai');
    expect(currentFilters()).toEqual({
      page: 2,
      status: 'approved',
      q: 'kedai',
      sort: 'businessName',
      order: 'asc',
    });
  });

  it('falls back to defaults for tampered params', () => {
    renderProbe('/?page=abc&status=hacked');
    expect(currentFilters()).toMatchObject({ page: 1, status: 'all' });
  });

  it('resets to page 1 when a filter changes and keeps defaults out of the URL', async () => {
    const { user, router } = renderProbe('/?page=4');
    await user.click(screen.getByRole('button', { name: 'approve' }));
    expect(searchOf(router)).toEqual({ status: 'approved' });
  });

  it('keeps the other filters when only the page changes', async () => {
    const { user, router } = renderProbe('/?status=approved');
    await user.click(screen.getByRole('button', { name: 'page 3' }));
    expect(searchOf(router)).toEqual({ status: 'approved', page: '3' });
  });

  it('clears everything on reset', async () => {
    const { user, router } = renderProbe('/?status=approved&q=kedai&page=2');
    await user.click(screen.getByRole('button', { name: 'reset' }));
    expect(router.state.location.search).toBe('');
  });
});
