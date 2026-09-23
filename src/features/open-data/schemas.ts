import { z } from 'zod';
import { assertNever } from '@/shared/lib/assertNever';

/** The series the page charts, in palette order (colour follows the fuel, never its position). */
export const FUEL_KEYS = ['ron95', 'ron97', 'diesel', 'ron95_budi95'] as const;
export const FUEL_RANGES = ['3m', '6m', '1y'] as const;

const columns = (value: z.ZodNumber) => ({
  date: z.iso.date(),
  ron95: value,
  ron97: value,
  diesel: value,
  diesel_eastmsia: value,
  // Subsidy prices only exist from the week each subsidy began.
  ron95_budi95: value.nullable(),
  ron95_skps: value.nullable(),
  diesel_budi: value.nullable(),
  diesel_skds: value.nullable(),
});

export const LevelRowSchema = z.object({
  series_type: z.literal('level'),
  ...columns(z.number().nonnegative()),
});

// Week-on-week change: can be negative.
export const ChangeRowSchema = z.object({
  series_type: z.literal('change_weekly'),
  ...columns(z.number()),
});

/** One dataset, two row shapes: told apart by `series_type`. */
export const FuelPriceRowSchema = z.discriminatedUnion('series_type', [
  LevelRowSchema,
  ChangeRowSchema,
]);

/**
 * data.gov.my writes timestamps like "2026-09-24 00:01", in Malaysian time (UTC+8). The ISO check
 * rejects impossible dates and times (month 13, 30 February, 24:00) as parse issues, which `Date`
 * would otherwise throw on or silently roll over.
 */
const malaysiaDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  .transform((value) => value.replace(' ', 'T'))
  .pipe(z.iso.datetime({ local: true, precision: -1 }))
  .transform((value) => new Date(`${value}:00+08:00`).toISOString());

export const CatalogueMetaSchema = z.object({
  catalogue_id: z.string(),
  data_as_of: malaysiaDateTime,
  last_updated: malaysiaDateTime,
  next_update: malaysiaDateTime,
  data_source: z.array(z.string()),
  update_frequency: z.string(),
});

type LevelRow = z.infer<typeof LevelRowSchema>;
type ChangeRow = z.infer<typeof ChangeRowSchema>;

/**
 * Validates row by row: a row this client does not understand (a new series type, a
 * malformed value) is skipped and counted, so one bad row cannot take the page down.
 */
export const FuelPriceResponseSchema = z
  .object({ meta: CatalogueMetaSchema, data: z.array(z.unknown()) })
  .transform(({ meta, data }) => {
    const levels: LevelRow[] = [];
    const changes: ChangeRow[] = [];
    let skipped = 0;
    for (const raw of data) {
      const parsed = FuelPriceRowSchema.safeParse(raw);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const row = parsed.data;
      switch (row.series_type) {
        case 'level':
          levels.push(row);
          break;
        case 'change_weekly':
          changes.push(row);
          break;
        default:
          assertNever(row);
      }
    }
    const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
    return { meta, levels: levels.sort(byDate), changes: changes.sort(byDate), skipped };
  });

const FuelKeySchema = z.enum(FUEL_KEYS);

export const FuelFiltersSchema = z.object({
  range: z.enum(FUEL_RANGES).catch('6m'),
  fuels: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(FuelKeySchema))
    // Keep the fixed palette order whatever order the URL lists them in.
    .transform((keys) => FUEL_KEYS.filter((key) => keys.includes(key)))
    .catch([...FUEL_KEYS]),
});
