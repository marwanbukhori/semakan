import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { formatDate } from '@/shared/lib/format';
import { FuelPriceResponseSchema } from '../schemas';
import type { FuelKey, LevelRow } from '../types';
import { FuelPriceChart } from './FuelPriceChart';

const { levels } = FuelPriceResponseSchema.parse(fixture);
const recent = levels.slice(-8);
const last = recent.at(-1)!;
const previous = recent.at(-2)!;

function renderChart(
  fuels: readonly FuelKey[] = ['ron95', 'ron97', 'diesel', 'ron95_budi95'],
  rows: readonly LevelRow[] = recent,
) {
  const user = userEvent.setup();
  const utils = render(<FuelPriceChart levels={rows} fuels={fuels} rangeLabel="3 months" />);
  return {
    ...utils,
    user,
    chart: screen.getByRole('group', { name: 'Weekly fuel prices, 3 months' }),
  };
}

describe('FuelPriceChart', () => {
  afterEach(() => vi.restoreAllMocks());

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

    await user.tab();
    expect(chart).toHaveFocus();
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

  it('announces a week on keyboard focus but not when the chart is clicked', async () => {
    const { user, chart } = renderChart(['ron95']);
    const readout = screen.getByRole('status');

    await user.click(chart);
    expect(chart).toHaveFocus();
    expect(readout).toBeEmptyDOMElement();

    await user.tab();
    await user.tab({ shift: true });
    expect(chart).toHaveFocus();
    expect(readout).toHaveTextContent(`RM ${last.ron95.toFixed(2)}`);
  });

  it('keeps each fuel on its own colour when others are hidden', () => {
    const { container } = renderChart(['ron97']);
    expect(container.querySelector('path[data-fuel="ron97"]')).toHaveStyle({
      stroke: 'var(--fuel-ron97)',
    });
  });

  it('leaves room for the widest end label inside the chart', () => {
    const { container } = renderChart();
    // "RON95 (BUDI95) RM 1.99" is ~145px at 12px Inter medium; 156px also fits RM 10.00.
    const label = screen.getByText(/^RON95 \(BUDI95\) RM/);
    expect(Number(label.getAttribute('x')) + 156).toBeLessThanOrEqual(
      Number(container.querySelector('svg')!.getAttribute('width')),
    );
  });

  it('keeps the tooltip inside the chart, flipped left of the crosshair past the middle', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(190);
    const { user, container } = renderChart(['ron95']);
    await user.tab();
    const tooltip = container.querySelector<HTMLElement>('[data-chart-tooltip]')!;
    const crosshair = Number(container.querySelector('[data-crosshair]')!.getAttribute('x1'));
    expect(tooltip.style.left).toBe(`${crosshair - 12 - 190}px`);
  });

  it('leaves browser shortcuts with modifier keys alone and explains Escape', async () => {
    const { user, chart } = renderChart(['ron95']);
    expect(chart).toHaveAccessibleDescription(expect.stringContaining('Escape hides the readout.'));
    await user.tab();
    const readout = screen.getByRole('status');
    const before = readout.textContent;

    expect(fireEvent.keyDown(chart, { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(fireEvent.keyDown(chart, { key: 'Home', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(chart, { key: 'ArrowLeft', metaKey: true })).toBe(true);
    expect(readout).toHaveTextContent(before);

    await user.keyboard('{ArrowLeft}');
    expect(readout).toHaveTextContent(`RM ${previous.ron95.toFixed(2)}`);
  });

  it('announces keyboard reading but not mouse hover', async () => {
    const { user, container } = renderChart(['ron95']);
    await user.tab();
    const readout = screen.getByRole('status');
    const before = readout.textContent;
    expect(before).not.toBe('');

    // jsdom's bounding box is all zeros, so clientX is the plot x: the first week.
    fireEvent.pointerMove(container.querySelector('svg rect')!, { clientX: 48 });

    expect(container.querySelector('[data-chart-tooltip]')).toHaveTextContent(
      formatDate(recent[0]!.date, 'en'),
    );
    expect(readout).toHaveTextContent(before);
  });

  it('spaces weeks by their real dates, not by row', () => {
    const rows = ['2025-09-25', '2025-09-30', '2025-10-09'].map((date) => ({ ...last, date }));
    const { container } = renderChart(['ron95'], rows);
    const d = container.querySelector('path[data-fuel="ron95"]')!.getAttribute('d')!;
    const [a, b, c] = [...d.matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]));
    // 5 days, then 9 days.
    expect((b! - a!) / (c! - b!)).toBeCloseTo(5 / 9, 2);
  });

  it('labels the y-axis with its unit', () => {
    const { container } = renderChart(['ron95']);
    expect(container.querySelector('svg')).toHaveTextContent('RM per litre');
  });

  it('shows a short message instead of a chart when there is nothing to plot', () => {
    const { container } = render(
      <FuelPriceChart levels={[]} fuels={['ron95']} rangeLabel="3 months" />,
    );
    expect(screen.getByText('No price data for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    expect(fireEvent.keyDown(wrapper, { key: 'End' })).toBe(true);
    act(() => wrapper.focus());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the message when every visible fuel is null for the period', () => {
    const rows = recent.map((row) => ({ ...row, ron95_budi95: null }));
    render(<FuelPriceChart levels={rows} fuels={['ron95_budi95']} rangeLabel="3 months" />);
    expect(screen.getByText('No price data for this period.')).toBeInTheDocument();
  });

  it('breaks lines at null weeks instead of plotting them as zero', () => {
    const rows = recent.map((row, i) => ({
      ...row,
      ron95_budi95: [0, 1, 2, 5].includes(i) ? null : 1.9 + i / 100,
    }));
    const { container, chart } = renderChart(['ron95', 'ron95_budi95'], rows);

    const d = container.querySelector('path[data-fuel="ron95_budi95"]')!.getAttribute('d')!;
    expect(d.match(/M/g)).toHaveLength(2);
    const ron95 = container.querySelector('path[data-fuel="ron95"]')!.getAttribute('d')!;
    const xs = [...ron95.matchAll(/[ML]([\d.]+),/g)].map((m) => m[1]);
    expect(d.startsWith(`M${xs[3]},`)).toBe(true);

    expect(screen.getByText(`RON95 (BUDI95) RM ${(1.9 + 7 / 100).toFixed(2)}`)).toBeInTheDocument();
    expect(chart).toHaveAccessibleDescription(
      expect.stringContaining(`RON95 (BUDI95) went from RM ${(1.9 + 3 / 100).toFixed(2)} to`),
    );
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });
});
