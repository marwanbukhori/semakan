import { render, screen, within } from '@testing-library/react';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import type { ChangeRow, LevelRow } from '../types';
import { LatestPricesTable } from './LatestPricesTable';

const { levels, changes } = FuelPriceResponseSchema.parse(fixture);
const newest = levels.at(-1)!;
const change = changes.find((row) => row.date === newest.date)!;

/** Builds a full LevelRow/ChangeRow so tests can exercise specific branches without relying on the fixture. */
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

function change_(overrides: Partial<ChangeRow> & { date: string }): ChangeRow {
  return {
    series_type: 'change_weekly',
    ron95: 0,
    ron97: 0,
    diesel: 0,
    diesel_eastmsia: 0,
    ron95_budi95: 0,
    ron95_skps: null,
    diesel_budi: null,
    diesel_skds: null,
    ...overrides,
  };
}

describe('LatestPricesTable', () => {
  it('lists the newest weeks first with each fuel and its weekly change', () => {
    render(<LatestPricesTable levels={levels} changes={changes} fuels={['ron95', 'diesel']} />);

    const table = screen.getByRole('table', { name: /latest weeks/i });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(7); // header + 6 weeks
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Week of', 'RON95', 'Diesel']);

    const firstBody = rows[1]!;
    expect(firstBody).toHaveTextContent(`RM ${newest.ron95.toFixed(2)}`);
    const direction = change.ron95 > 0.005 ? 'up' : change.ron95 < -0.005 ? 'down' : 'no change';
    expect(firstBody).toHaveTextContent(
      direction === 'no change'
        ? 'no change'
        : `${direction} RM ${Math.abs(change.ron95).toFixed(2)}`,
    );
  });

  it('shows a downward change with its spoken direction and the ArrowDown icon', () => {
    const rows = [level({ date: '2026-09-16', ron95: 2.05 })];
    const rowChanges = [change_({ date: '2026-09-16', ron95: -0.38 })];
    render(<LatestPricesTable levels={rows} changes={rowChanges} fuels={['ron95']} />);

    const table = screen.getByRole('table', { name: /latest weeks/i });
    expect(within(table).getByText('down RM 0.38')).toBeInTheDocument();
    const cell = within(table).getAllByRole('gridcell')[1]!;
    const iconGroup = cell.querySelector('svg > g');
    expect(iconGroup?.id).toBe('Icon/arrow-down');
  });

  it('treats a change under 0.005 as no change', () => {
    const rows = [level({ date: '2026-09-16', ron95: 2.05 })];
    const rowChanges = [change_({ date: '2026-09-16', ron95: 0.003 })];
    render(<LatestPricesTable levels={rows} changes={rowChanges} fuels={['ron95']} />);

    const table = screen.getByRole('table', { name: /latest weeks/i });
    expect(within(table).getByText('no change')).toBeInTheDocument();
  });

  it('announces a missing subsidy price as not available, with the dash hidden from screen readers', () => {
    const rows = [level({ date: '2026-09-16', ron95_budi95: null })];
    const rowChanges = [change_({ date: '2026-09-16' })];
    render(<LatestPricesTable levels={rows} changes={rowChanges} fuels={['ron95_budi95']} />);

    const table = screen.getByRole('table', { name: /latest weeks/i });
    const dash = within(table).getByText('—');
    expect(dash).toHaveAttribute('aria-hidden', 'true');
    expect(within(table).getByText('Not available')).toBeInTheDocument();
  });
});
