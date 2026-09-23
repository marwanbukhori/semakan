type Point = { x: number; y: number };

export function linearScale(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number],
): (value: number) => number {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * k;
}

export function niceDomain(values: readonly number[], step = 0.5): [number, number] {
  if (values.length === 0) return [0, step];
  const lo = Math.round(Math.floor(Math.min(...values) / step + 1e-9) * step * 100) / 100;
  let hi = Math.round(Math.ceil(Math.max(...values) / step - 1e-9) * step * 100) / 100;
  if (hi === lo) hi = lo + step;
  return [lo, hi];
}

export function ticks([lo, hi]: [number, number], step = 0.5): number[] {
  const out: number[] = [];
  for (let value = lo; value <= hi + 1e-9; value += step) out.push(Math.round(value * 100) / 100);
  return out;
}

/** A null starts a new segment: missing weeks are gaps, never zeros. */
export function segmentPath(points: readonly (Point | null)[]): string {
  let path = '';
  let penDown = false;
  for (const point of points) {
    if (point === null) {
      penDown = false;
      continue;
    }
    path += `${penDown ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    penDown = true;
  }
  return path;
}

export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  xs.forEach((value, index) => {
    const distance = Math.abs(value - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Keep end labels at least `gap` apart and inside [min, max], preserving their order.
 * When `items.length * gap` exceeds `max - min`, bounds and order win over the gap.
 */
export function layoutEndLabels(
  items: readonly { key: string; y: number }[],
  gap: number,
  [min, max]: [number, number],
): Record<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const ys = sorted.map((item) => item.y);
  for (let i = 1; i < ys.length; i += 1) ys[i] = Math.max(ys[i]!, ys[i - 1]! + gap);
  for (let i = ys.length - 1; i >= 0; i -= 1) {
    const ceiling = i === ys.length - 1 ? max : ys[i + 1]! - gap;
    ys[i] = Math.max(min, Math.min(ys[i]!, ceiling));
  }
  return Object.fromEntries(sorted.map((item, i) => [item.key, ys[i]!]));
}

export function monthTickIndexes(dates: readonly string[], maxTicks: number): number[] {
  if (maxTicks <= 0) return [];
  const firsts = dates.flatMap((date, i) =>
    i === 0 || date.slice(0, 7) !== dates[i - 1]!.slice(0, 7) ? [i] : [],
  );
  if (firsts.length <= maxTicks) return firsts;
  const every = Math.ceil(firsts.length / Math.max(maxTicks, 1));
  return firsts.filter((_, i) => i % every === 0);
}

/**
 * The tooltip's left edge: `offset` right of the anchor, or left of it once the anchor passes the
 * chart's middle, then clamped so the whole tooltip stays inside [0, chartWidth].
 */
export function tooltipLeft(
  anchorX: number,
  tooltipWidth: number,
  chartWidth: number,
  offset = 12,
): number {
  const left = anchorX > chartWidth / 2 ? anchorX - offset - tooltipWidth : anchorX + offset;
  return Math.max(0, Math.min(left, chartWidth - tooltipWidth));
}
