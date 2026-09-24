import type { FuelRange } from './types';

const RANGE_MONTHS: Record<FuelRange, number> = { '3m': 3, '6m': 6, '1y': 12 };

/** First day of the range as YYYY-MM-DD (data.gov.my's date_start format). */
export function rangeStart(range: FuelRange, now = new Date()): string {
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - RANGE_MONTHS[range]);
  return start.toISOString().slice(0, 10);
}
