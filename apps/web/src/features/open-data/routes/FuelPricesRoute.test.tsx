import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { setDevControls } from '@/mocks/devControls';
import { DATA_GOV_CATALOGUE_URL } from '@/mocks/handlers/dataGov';
import { server } from '@/mocks/node';
import { renderRoutes } from '@/test/render';
import { pinDate, unpinDate } from '@/test/time';
import { Component as FuelPricesRoute } from './FuelPricesRoute';

const renderPage = (url = '/open-data/fuel-prices') =>
  renderRoutes([{ path: '/open-data/fuel-prices', Component: FuelPricesRoute }], {
    initialEntries: [url],
  });

describe('/open-data/fuel-prices', () => {
  beforeEach(() => pinDate('2026-09-25T00:00:00.000Z'));
  afterEach(unpinDate);

  it('loads, then shows the chart, the latest weeks and the source', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Fuel prices' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading fuel prices…');

    expect(
      await screen.findByRole('group', { name: 'Weekly fuel prices, 6 months' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /latest weeks/i })).toBeInTheDocument();
    expect(screen.getByText('Source: MOF via data.gov.my')).toBeInTheDocument();
  });

  it('changes the range from the filter row and keeps it in the URL', async () => {
    const { user, router } = renderPage();
    await screen.findByRole('group', { name: 'Weekly fuel prices, 6 months' });

    await user.click(screen.getByRole('button', { name: '3 months' }));

    expect(
      await screen.findByRole('group', { name: 'Weekly fuel prices, 3 months' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?range=3m');
  });

  it('hides a fuel from the chart and every table', async () => {
    const { user } = renderPage();
    await screen.findByRole('group', { name: /Weekly fuel prices/ });

    await user.click(screen.getByRole('button', { name: 'RON97' }));

    const latest = screen.getByRole('table', { name: /latest weeks/i });
    await waitFor(() =>
      expect(within(latest).queryByRole('columnheader', { name: 'RON97' })).not.toBeInTheDocument(),
    );
  });

  it('asks for a fuel when none is selected', async () => {
    renderPage('/open-data/fuel-prices?fuels=');
    expect(
      await screen.findByText('Choose at least one fuel to show the chart.'),
    ).toBeInTheDocument();
  });

  it('explains a rate limit and lets the user retry', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    const { user } = renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load fuel prices");
    expect(alert).toHaveTextContent('Too many requests right now');

    setDevControls({ dataGov: 'fixture' });
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('group', { name: /Weekly fuel prices/ })).toBeInTheDocument();
  });

  it('explains an offline network', async () => {
    setDevControls({ dataGov: 'offline' });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  });

  it('keeps working when the API sends rows it does not understand, and says so', async () => {
    server.use(
      http.get(DATA_GOV_CATALOGUE_URL, () =>
        HttpResponse.json({
          ...fixture,
          data: [...fixture.data, { ...fixture.data[0], series_type: 'change_monthly' }],
        }),
      ),
    );
    renderPage();

    expect(
      await screen.findByText('1 row had an unexpected format and is not shown.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Weekly fuel prices/ })).toBeInTheDocument();
  });
});
