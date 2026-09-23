import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import type { FuelKey } from '../types';
import { FuelPriceChart } from './FuelPriceChart';

const { levels } = FuelPriceResponseSchema.parse(fixture);
const recent = levels.slice(-8);
const last = recent.at(-1)!;
const previous = recent.at(-2)!;

function renderChart(fuels: readonly FuelKey[] = ['ron95', 'ron97', 'diesel', 'ron95_budi95']) {
  const user = userEvent.setup();
  const utils = render(<FuelPriceChart levels={recent} fuels={fuels} rangeLabel="3 months" />);
  return {
    ...utils,
    user,
    chart: screen.getByRole('group', { name: 'Weekly fuel prices, 3 months' }),
  };
}

describe('FuelPriceChart', () => {
  it('draws one line per visible fuel and labels each line end directly', () => {
    const { container } = renderChart(['ron95', 'diesel']);
    expect(
      [...container.querySelectorAll('path[data-fuel]')].map((p) => p.getAttribute('data-fuel')),
    ).toEqual(['ron95', 'diesel']);
    expect(screen.getByText(`RON95 RM ${last.ron95.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`Diesel RM ${last.diesel.toFixed(2)}`)).toBeInTheDocument();
  });

  it('describes the trend in text for screen readers', () => {
    const { chart } = renderChart(['ron95']);
    expect(chart).toHaveAccessibleDescription(
      expect.stringContaining(
        `RON95 went from RM ${recent[0]!.ron95.toFixed(2)} to RM ${last.ron95.toFixed(2)}.`,
      ),
    );
  });

  it('reads each week aloud with the keyboard', async () => {
    const { user, chart } = renderChart(['ron95', 'ron97']);

    act(() => chart.focus());
    const readout = screen.getByRole('status');
    expect(readout).toHaveTextContent(`RM ${last.ron97.toFixed(2)}`);

    await user.keyboard('{ArrowLeft}');
    expect(readout).toHaveTextContent(`RM ${previous.ron95.toFixed(2)}`);
    expect(readout).toHaveTextContent('RON95');

    await user.keyboard('{Home}');
    expect(readout).toHaveTextContent(`RM ${recent[0]!.ron95.toFixed(2)}`);

    await user.keyboard('{Escape}');
    expect(readout).toBeEmptyDOMElement();
  });

  it('keeps each fuel on its own colour when others are hidden', () => {
    const { container } = renderChart(['ron97']);
    expect(container.querySelector('path[data-fuel="ron97"]')).toHaveStyle({
      stroke: 'var(--fuel-ron97)',
    });
  });
});
