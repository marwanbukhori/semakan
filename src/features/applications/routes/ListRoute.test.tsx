import { act, screen, waitFor, within } from '@testing-library/react';
import { seedApplications } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { i18n } from '@/shared/i18n';
import { renderRoutes } from '@/test/render';
import { Component as ListRoute } from './ListRoute';

const renderList = (url = '/applications') =>
  renderRoutes([{ path: '/applications', Component: ListRoute }], { initialEntries: [url] });

const referenceLinks = () => screen.findAllByRole('link', { name: /^LPP-2026-/ });

/** The wrapper around the table that tells assistive technology a refresh is in progress. */
const busyRegion = () => screen.getByRole('table').closest('div[aria-busy]');

describe('/applications', () => {
  it('shows a loading skeleton, then the first page and the total', async () => {
    renderList();

    expect(screen.getByRole('table', { name: 'Loading applications…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(await referenceLinks()).toHaveLength(10);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('57 applications');
  });

  it('filters by status and writes it to the URL', async () => {
    const approvedCount = seedApplications().filter((a) => a.status === 'approved').length;
    const { user, router } = renderList();
    await referenceLinks();

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Approved' }));

    await waitFor(() => expect(router.state.location.search).toBe('?status=approved'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        new RegExp(`^${approvedCount} application`),
      ),
    );
  });

  it('restores filters and sort from a shared URL', async () => {
    renderList('/applications?status=approved&sort=referenceNo&order=asc');

    await referenceLinks();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Approved');
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('debounces search into the URL and shows matching results', async () => {
    const { user, router } = renderList();
    await referenceLinks();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Selera');

    await waitFor(() => expect(router.state.location.search).toBe('?q=Selera'));
    await waitFor(() =>
      expect(screen.getAllByText('Restoran Selera Kampung').length).toBeGreaterThan(0),
    );
  });

  it('shows an empty state whose action clears the filters', async () => {
    const { user, router } = renderList('/applications?q=zzzz-no-match');

    expect(await screen.findByText('No applications found')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await referenceLinks()).toHaveLength(10);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  });

  it('shows a server error with a working retry', async () => {
    setDevControls({ failure: 'server' });
    const { user, queryClient } = renderList();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load applications");
    expect(alert).toHaveTextContent('The server had a problem');
    expect(screen.queryByRole('navigation', { name: 'Pages of results' })).not.toBeInTheDocument();

    setDevControls({ failure: 'none' });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await referenceLinks()).toHaveLength(10);
    expect(screen.getByRole('status')).toHaveTextContent('57 applications');

    // A refetch that fails after a successful load (as the Dev Panel triggers) keeps the old
    // data in the cache; the old count and pagination must not stay on screen next to the error.
    setDevControls({ failure: 'server' });
    await act(() => queryClient.invalidateQueries());
    expect(await screen.findByRole('alert')).toHaveTextContent('The server had a problem');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('navigation', { name: 'Pages of results' })).not.toBeInTheDocument();
  });

  it('explains a network failure differently from a server error', async () => {
    setDevControls({ failure: 'network' });
    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  });

  it('moves to the next page', async () => {
    const { user, router } = renderList();
    await referenceLinks();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('exposes a background refresh as busy while keeping the current rows', async () => {
    const { user } = renderList();
    await referenceLinks();
    expect(busyRegion()).toHaveAttribute('aria-busy', 'false');

    setDevControls({ latencyMs: 800 });
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(busyRegion()).toHaveAttribute('aria-busy', 'true'));
    expect(await referenceLinks()).toHaveLength(10);
    await waitFor(() => expect(busyRegion()).toHaveAttribute('aria-busy', 'false'), {
      timeout: 2000,
    });
  });

  it('labels the pagination in the current language', async () => {
    renderList();
    await referenceLinks();
    expect(screen.getByRole('navigation', { name: 'Pages of results' })).toBeInTheDocument();

    try {
      await act(() => i18n.changeLanguage('ms'));
      const nav = screen.getByRole('navigation', { name: 'Halaman keputusan' });
      expect(within(nav).getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
      expect(within(nav).getByRole('button', { name: 'Seterusnya' })).toBeEnabled();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
