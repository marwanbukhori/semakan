import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import { ChartDataTable } from './ChartDataTable';

const { levels } = FuelPriceResponseSchema.parse(fixture);

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
