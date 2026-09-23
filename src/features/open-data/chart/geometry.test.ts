import {
  layoutEndLabels,
  linearScale,
  monthTickIndexes,
  nearestIndex,
  niceDomain,
  segmentPath,
  ticks,
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

  it('puts a tick at the first week of each month, thinned to fit', () => {
    const dates = [
      '2026-01-01',
      '2026-01-08',
      '2026-02-05',
      '2026-02-12',
      '2026-03-05',
      '2026-04-02',
    ];
    expect(monthTickIndexes(dates, 10)).toEqual([0, 2, 4, 5]);
    expect(monthTickIndexes(dates, 2)).toEqual([0, 4]);
  });
});
