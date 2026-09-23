import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import type { LevelRow } from '../types';
import { ChartDataTable } from './ChartDataTable';

const { levels } = FuelPriceResponseSchema.parse(fixture);

/** Builds a full LevelRow so tests can exercise specific branches without relying on the fixture. */
function level(overrides: Partial<LevelRow> & { date: string }): LevelRow {
  return {
    series_type: 'level',
    ron95: 2.05,
    ron97: 3.47,
    diesel: 2.15,
    diesel_eastmsia: 2.15,
    ron95_budi95: 1.99,
    ron95_skps: null,
    diesel_budi: null,
    diesel_skds: null,
    ...overrides,
  };
}

it('offers every plotted week as a table', async () => {
  const user = userEvent.setup();
  render(<ChartDataTable levels={levels.slice(-10)} fuels={['ron97']} />);

  await user.click(screen.getByText('Show the chart data as a table'));

  const table = screen.getByRole('table', { name: 'Weekly fuel prices, RM per litre' });
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent),
  ).toEqual(['Week of', 'RON97']);
});

it('announces a missing subsidy price as not available, with the dash hidden from screen readers', async () => {
  const user = userEvent.setup();
  const rows = [level({ date: '2026-09-16', ron95_budi95: null })];
  render(<ChartDataTable levels={rows} fuels={['ron95_budi95']} />);

  await user.click(screen.getByText('Show the chart data as a table'));

  const table = screen.getByRole('table', { name: 'Weekly fuel prices, RM per litre' });
  const dash = within(table).getByText('—');
  expect(dash).toHaveAttribute('aria-hidden', 'true');
  expect(within(table).getByText('Not available')).toBeInTheDocument();
});
