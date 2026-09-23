import { render, screen, within } from '@testing-library/react';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import { LatestPricesTable } from './LatestPricesTable';

const { levels, changes } = FuelPriceResponseSchema.parse(fixture);
const newest = levels.at(-1)!;
const change = changes.find((row) => row.date === newest.date)!;

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
});
