import {
  layoutEndLabels,
  linearScale,
  monthTickIndexes,
  nearestIndex,
  niceDomain,
  segmentPath,
  ticks,
  tooltipLeft,
} from './geometry';

describe('chart geometry', () => {
  it('maps a domain onto a range, including inverted y ranges', () => {
    const y = linearScale([0, 10], [100, 0]);
    expect(y(0)).toBe(100);
    expect(y(5)).toBe(50);
    expect(linearScale([3, 3], [0, 10])(3)).toBe(0);
  });

  it('rounds the domain outward to whole steps', () => {
    expect(niceDomain([1.99, 5.42])).toEqual([1.5, 5.5]);
    expect(niceDomain([4.5, 4.5])).toEqual([4.5, 5]);
    expect(niceDomain([])).toEqual([0, 0.5]);
    expect(ticks([1.5, 3])).toEqual([1.5, 2, 2.5, 3]);
  });

  it('tolerates float error near a step boundary like ticks() does', () => {
    expect(niceDomain([4.499999999999])).toEqual([4.5, 5]);
    expect(niceDomain([4.500000000001])).toEqual([4.5, 5]);
  });

  it('breaks a line at missing values instead of drawing them as zero', () => {
    expect(
      segmentPath([{ x: 0, y: 10 }, { x: 10, y: 20 }, null, { x: 30, y: 5 }, { x: 40, y: 6 }]),
    ).toBe('M0.0,10.0L10.0,20.0M30.0,5.0L40.0,6.0');
    expect(segmentPath([null, null])).toBe('');
  });

  it('snaps to the nearest data position', () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 26)).toBe(3);
    expect(nearestIndex([], 5)).toBe(-1);
  });

  it('spreads end labels apart but keeps them in bounds and in order', () => {
    const labels = layoutEndLabels(
      [
        { key: 'a', y: 50 },
        { key: 'b', y: 52 },
        { key: 'c', y: 200 },
      ],
      16,
      [0, 210],
    );
    expect(labels.a).toBe(50);
    expect(labels.b).toBe(66);
    expect(labels.c).toBe(200);

    const squeezed = layoutEndLabels(
      [
        { key: 'a', y: 200 },
        { key: 'b', y: 205 },
      ],
      16,
      [0, 210],
    );
    expect(squeezed.b).toBe(210);
    expect(squeezed.a).toBe(194);
  });

  // One pixel per day, so the spacing rules read in days.
  const byDay = (dates: readonly string[], pxPerDay = 1) =>
    dates.map((date) => ((Date.parse(date) - Date.parse(dates[0]!)) / 86_400_000) * pxPerDay);

  it('puts a tick at the first week of each month, thinned evenly to keep them apart', () => {
    const dates = [
      '2026-01-01',
      '2026-01-08',
      '2026-02-05',
      '2026-02-12',
      '2026-03-05',
      '2026-04-02',
    ];
    expect(monthTickIndexes(dates, byDay(dates), 10)).toEqual([0, 2, 4, 5]);
    // February to March is 28px, under 30: every other month instead.
    expect(monthTickIndexes(dates, byDay(dates), 30)).toEqual([0, 4]);
    expect(monthTickIndexes([], [], 72)).toEqual([]);
  });

  it('drops a leading partial month whose tick would crowd the next month', () => {
    const dates = [
      '2026-03-26',
      '2026-04-02',
      '2026-04-09',
      '2026-04-16',
      '2026-04-23',
      '2026-04-30',
      '2026-05-07',
    ];
    // At 3px a day, 26 March sits 21px before 2 April: too close for two labels.
    expect(monthTickIndexes(dates, byDay(dates, 3), 72)).toEqual([1, 6]);
    // With room to spare, the partial month keeps its tick.
    expect(monthTickIndexes(dates, byDay(dates, 12), 72)).toEqual([0, 1, 6]);
  });

  it('places the tooltip beside the anchor, flipping past the middle and staying in the chart', () => {
    expect(tooltipLeft(100, 190, 720)).toBe(112);
    expect(tooltipLeft(600, 190, 720)).toBe(398);
    // A 343px phone chart: flipped at 172 it would start at -30, so it is clamped to 0.
    expect(tooltipLeft(172, 190, 343)).toBe(0);
    // Not flipped at 150 it would end at 352, so it is pulled back to end at 343.
    expect(tooltipLeft(150, 190, 343)).toBe(153);
    expect(tooltipLeft(10, 400, 343)).toBe(0);
  });
});
