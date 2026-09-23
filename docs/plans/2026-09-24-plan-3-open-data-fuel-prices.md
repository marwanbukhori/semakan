# Plan 3: data.gov.my Fuel Prices — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/open-data/fuel-prices` page that calls the real data.gov.my API from the browser, validates its mixed-row response with a zod discriminated union, and shows weekly fuel prices. It has an accessible line chart, a latest-weeks table with weekly changes, a full data table and a data-freshness footer. The Dev Panel can switch the source to recorded data or force 429, 404 and offline.

**Architecture:** A second `apiClient` instance (`dataGovClient`, base URL `https://api.data.gov.my`) with its own schemas in a new `open-data` feature. MSW intercepts `https://api.data.gov.my/data-catalogue/`: in *Live* mode it calls `passthrough()`, so the real request goes out; in the simulated modes it serves a recorded fixture or a forced error. Tests always use the fixture. The chart is hand-built SVG (no chart library), following the dataviz skill: one axis, 2px lines, direct end labels, a crosshair tooltip on hover and keyboard, a table view, and a validated palette in both themes.

**Tech Stack:** As in Plans 1–2. No new runtime dependencies.

**Spec:** `docs/specs/2026-09-23-semakan-design.md` §7a (and §5, §8, §9). Plans 1–2 are merged.

## Global Constraints

Everything in Plans 1–2's Global Constraints still applies, including:
- MYDS per-component imports, and MYDS tokens only for Tailwind classes.
- React Router 8 with `createRoutes()`, and `void navigate(...)`.
- TanStack Query v5 argument order.
- Every UI string through i18next, with `ms.ts` type-checked against `en.ts`.
- TDD, and MSW as the only network mock.
- `npm run format` before every commit.

Also:

- Work on branch `plan-3-open-data`, created from `main`. The controller creates it.
- **Verified API facts (probed 2026-09-24):**
  - **Endpoint:** `GET https://api.data.gov.my/data-catalogue/?id=fuelprice`. The trailing slash is required; without it the API redirects with 301.
  - **Query parameters:** `date_start=YYYY-MM-DD@date` and `date_end=...@date`, both accepted URL-encoded as `%40`. Also `sort=date` or `-date`, `meta=true`, `limit`. CORS allows `*`.
  - **With `meta=true`** the body is `{ meta: { catalogue_id, data_as_of: "YYYY-MM-DD HH:mm", last_updated, next_update, data_source: string[], update_frequency, total, ... }, data: Row[] }`.
    - The timestamps are Malaysian time with no offset.
    - `meta.total` is the number of rows *returned*, not the number available.
  - **Rows:** a mix of `series_type: "level"` (RM per litre) and `"change_weekly"` (the week-on-week change, which can be negative and carries float noise).
    - `ron95`, `ron97`, `diesel` and `diesel_eastmsia` are never null.
    - `ron95_budi95`, `ron95_skps`, `diesel_budi` and `diesel_skds` are null before those subsidies existed.
  - **Errors:** an unknown dataset returns `404 { status_code: 404, details: string[] }`.
  - **Rate limiting:** no rate-limit headers were seen, but the UI must handle 429.
  - **Values change:** published values can be revised later (a RON97 value changed within a day).
- **Tests never call the real API.** In test mode (`import.meta.env.MODE === 'test'`), the data.gov.my source defaults to the recorded fixture.
- **Pin the date in tests.** Tests that depend on "now" (the date ranges) pin it with `pinDate('2026-09-25T00:00:00.000Z')` from `src/test/time.ts`, which fakes only `Date`, so timers and `waitFor` keep working.
- **Charted series, in this fixed order:** `ron95`, `ron97`, `diesel`, `ron95_budi95`.
  - **Palette:** dataviz reference slots 1–4, validated on the MYDS surfaces.
    - **Light**, on `#ffffff`: `#2a78d6`, `#eb6834`, `#1baf7a`, `#eda100`. All checks pass; contrast gives a WARN, so the relief rule applies and direct labels plus a table view are required.
    - **Dark**, on `#18181b`: `#3987e5`, `#d95926`, `#199e70`, `#c98500`. All pass.
  - These live as CSS custom properties scoped to `.fuel-chart` in `src/index.css`. They are the one allowed exception to "MYDS tokens only": MYDS has no categorical data palette.
  - Colour follows the fuel, never its position. Hiding a fuel must not repaint the others.
- **Dataviz rules:**
  - One y-axis, in RM per litre.
  - 2px lines with round joins, and end dots of r=4 with a 2px surface-colour ring.
  - Gridlines are 1px, solid and recessive (`stroke-otl-divider`).
  - Text never uses a series colour; the colour sits on a line key next to it.
  - The legend (the fuel toggles) is always shown. With 4 or fewer series, lines also get direct labels, except below 480px chart width, where the legend and tooltip carry identity.
  - Hovering gives a crosshair that snaps to the nearest week and one tooltip listing every visible series, value first. The same readout is available by keyboard.
  - A table view exists.
  - While data reloads, the chart keeps its previous render at reduced opacity.
- Null values break the line into segments; never draw them as zero.
- The page credits the source: "Source: MOF via data.gov.my", with a link to the dataset.

---

## File Map

```
src/
  index.css                                  + .fuel-chart palette (light/dark)
  test/time.ts                               NEW: pinDate / unpinDate
  shared/
    ui/LoadError.tsx                         MOVED from features/applications/components/ListStates.tsx
    api/errorMessage.ts                      + 429 -> errors.rateLimited, 404 -> errors.notFound
    hooks/useElementWidth.ts                 NEW (ResizeObserver)
    lib/format.ts                            + formatPrice, formatMonthYear
    i18n/en.ts, ms.ts                        + errors.*, devPanel.dataGov.*, fuel.*, app.nav.fuel
  features/open-data/
    schemas.ts                               row union, meta, response transform, filters
    types.ts
    ranges.ts                                FUEL_RANGES, rangeStart()
    api/client.ts                            dataGovClient
    api/keys.ts                              openDataKeys
    api/queries.ts                           useFuelPrices(range)
    hooks/useFuelFilters.ts                  URL state: range + fuels
    chart/geometry.ts                        pure scale/path/label/tick helpers
    components/FuelFilters.tsx               range buttons + fuel toggles (the legend)
    components/FuelPriceChart.tsx            SVG line chart
    components/LatestPricesTable.tsx
    components/ChartDataTable.tsx
    components/DataFreshness.tsx
    routes/FuelPricesRoute.tsx
  mocks/
    fixtures/fuelprice.json                  NEW: recorded real response (1 year)
    devControls.ts                           + dataGov mode
    handlers/dataGov.ts                      NEW: live passthrough / fixture / errors
    handlers/index.ts                        + dataGovHandlers
  app/
    router.ts                                + open-data/fuel-prices
    AppLayout.tsx                            + nav link
    dev-panel/DevPanel.tsx                   + data.gov.my section
```

---

### Task 1: Shared load error and API-specific error messages

**Files:**
- Create: `src/shared/ui/LoadError.tsx`
- Modify: `src/features/applications/components/ListStates.tsx` (remove `LoadError`), `src/features/applications/routes/ListRoute.tsx`, `src/features/applications/routes/DetailRoute.tsx` (import from shared), `src/shared/api/errorMessage.ts`, `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`
- Test: `src/shared/api/errorMessage.test.ts` (append)

**Interfaces:**
- Produces: `LoadError({ title, error, onRetry })` from `@/shared/ui/LoadError`, with exactly the markup and behaviour it has today.
- `apiErrorMessageKey(error)` now returns:
  - `'errors.rateLimited'` for an http 429
  - `'errors.notFound'` for an http 404
  - everything else as before

- [ ] **Step 1: Write the failing tests** (append to `errorMessage.test.ts`)

```ts
it('explains rate limiting and missing data separately from server errors', () => {
  expect(apiErrorMessageKey(new ApiError({ kind: 'http', status: 429, message: 'x' }))).toBe('errors.rateLimited');
  expect(apiErrorMessageKey(new ApiError({ kind: 'http', status: 404, message: 'x' }))).toBe('errors.notFound');
  expect(apiErrorMessageKey(new ApiError({ kind: 'http', status: 503, message: 'x' }))).toBe('errors.server');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/shared/api/errorMessage.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `errorMessage.ts`, change the `http` case:

```ts
    case 'http':
      if (error.status === 429) return 'errors.rateLimited' as const;
      if (error.status === 404) return 'errors.notFound' as const;
      return 'errors.server' as const;
    case 'validation':
    case 'conflict':
      return 'errors.server' as const;
```

Add to `errors` in `en.ts`:

```ts
    rateLimited: 'Too many requests right now. Wait a minute, then try again.',
    notFound: "We couldn't find that data.",
```

and in `ms.ts`:

```ts
    rateLimited: 'Terlalu banyak permintaan buat masa ini. Tunggu seminit, kemudian cuba lagi.',
    notFound: 'Data tersebut tidak ditemui.',
```

Move `LoadError` from `ListStates.tsx` to `src/shared/ui/LoadError.tsx` without changing it (shared code may import MYDS, i18n and `@/shared/api/errorMessage`). Then update the imports in `ListRoute.tsx` and `DetailRoute.tsx`. The boundaries lint rule now lets the new `open-data` feature use it.

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS. The applications tests are unchanged.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src
git commit -m "Share LoadError and explain rate limits and missing data"
```

---

### Task 2: data.gov.my contract and the recorded fixture

**Files:**
- Create: `src/features/open-data/schemas.ts`, `src/features/open-data/types.ts`, `src/features/open-data/ranges.ts`, `src/mocks/fixtures/fuelprice.json`, `src/test/time.ts`
- Modify: `tsconfig.app.json` (`"resolveJsonModule": true`)
- Test: `src/features/open-data/schemas.test.ts`, `src/features/open-data/ranges.test.ts`

**Interfaces:**
- `FUEL_KEYS = ['ron95', 'ron97', 'diesel', 'ron95_budi95'] as const`
- `LevelRowSchema`, `ChangeRowSchema`, and `FuelPriceRowSchema` (a discriminated union on `series_type`)
- `CatalogueMetaSchema`: its timestamps come out as ISO strings in UTC
- `FuelPriceResponseSchema`: `{ meta, data: unknown[] }` is transformed to `{ meta, levels: LevelRow[], changes: ChangeRow[], skipped: number }`. Both arrays are sorted ascending by date. Rows that fail the union are counted in `skipped`, not thrown.
- `FUEL_RANGES = ['3m', '6m', '1y'] as const`, and `FuelFiltersSchema` (`range` defaults to `'6m'`, `fuels` to every key)
- Types: `FuelKey`, `FuelRange`, `LevelRow`, `ChangeRow`, `CatalogueMeta`, `FuelPrices`, `FuelFilters`
- `rangeStart(range, now = new Date()): string` returns `YYYY-MM-DD`: `now` minus 3, 6 or 12 months, in UTC.
- `pinDate(iso)` and `unpinDate()`

- [ ] **Step 1: Record the fixture**

Run from `/Users/marwanbukhori/semakan`:

```bash
mkdir -p src/mocks/fixtures
curl -s "https://api.data.gov.my/data-catalogue/?id=fuelprice&date_start=2025-09-24%40date&date_end=2026-09-24%40date&sort=date&meta=true" -o src/mocks/fixtures/fuelprice.json
node -e "const d=require('./src/mocks/fixtures/fuelprice.json'); console.log(d.meta.data_as_of, d.data.length, d.data[0].date, d.data.at(-1).date)"
```

Expected: about 106 rows, from 2025-09-25 to 2026-09-24. Commit the file exactly as returned (Prettier may reformat it; that's fine).

- [ ] **Step 2: Write the failing tests**

`src/features/open-data/schemas.test.ts`:

```ts
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelFiltersSchema, FuelPriceResponseSchema, FuelPriceRowSchema } from './schemas';

describe('FuelPriceResponseSchema', () => {
  it('splits the recorded response into sorted price levels and weekly changes', () => {
    const result = FuelPriceResponseSchema.parse(fixture);
    expect(result.skipped).toBe(0);
    expect(result.levels.length).toBeGreaterThan(40);
    expect(result.changes.length).toBeGreaterThan(40);
    expect(result.levels.every((row) => row.series_type === 'level')).toBe(true);
    const dates = result.levels.map((row) => row.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('reads data.gov.my timestamps as Malaysian time', () => {
    const result = FuelPriceResponseSchema.parse({
      ...fixture,
      meta: { ...fixture.meta, data_as_of: '2026-09-24 00:01' },
    });
    expect(result.meta.data_as_of).toBe('2026-09-23T16:01:00.000Z');
  });

  it('skips and counts rows it does not understand instead of failing the page', () => {
    const result = FuelPriceResponseSchema.parse({
      ...fixture,
      data: [...fixture.data, { ...fixture.data[0], series_type: 'change_monthly' }, { date: 'bad' }],
    });
    expect(result.skipped).toBe(2);
  });
});

describe('FuelPriceRowSchema', () => {
  const base = { date: '2026-09-24', ron95: 4.57, ron97: 5.05, diesel: 5.42, diesel_eastmsia: 2.15 };

  it('accepts negative weekly changes and missing subsidy prices', () => {
    const change = FuelPriceRowSchema.parse({
      ...base,
      series_type: 'change_weekly',
      ron95: -0.38,
      ron95_budi95: null,
      ron95_skps: null,
      diesel_budi: null,
      diesel_skds: null,
    });
    expect(change.ron95).toBe(-0.38);
  });

  it('rejects a negative price level', () => {
    const result = FuelPriceRowSchema.safeParse({
      ...base,
      series_type: 'level',
      ron95: -1,
      ron95_budi95: null,
      ron95_skps: null,
      diesel_budi: null,
      diesel_skds: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('FuelFiltersSchema', () => {
  it('defaults to six months and every fuel', () => {
    expect(FuelFiltersSchema.parse({})).toEqual({
      range: '6m',
      fuels: ['ron95', 'ron97', 'diesel', 'ron95_budi95'],
    });
  });

  it('reads fuels from a comma list, and falls back for tampered values', () => {
    expect(FuelFiltersSchema.parse({ range: '1y', fuels: 'diesel,ron95' })).toEqual({
      range: '1y',
      fuels: ['diesel', 'ron95'],
    });
    expect(FuelFiltersSchema.parse({ range: '10y', fuels: 'petrol' })).toEqual(FuelFiltersSchema.parse({}));
  });

  it('allows an explicitly empty selection', () => {
    expect(FuelFiltersSchema.parse({ fuels: '' }).fuels).toEqual([]);
  });
});
```

`src/features/open-data/ranges.test.ts`:

```ts
import { rangeStart } from './ranges';

describe('rangeStart', () => {
  const now = new Date('2026-09-25T00:00:00.000Z');

  it('goes back by whole months', () => {
    expect(rangeStart('3m', now)).toBe('2026-06-25');
    expect(rangeStart('6m', now)).toBe('2026-03-25');
    expect(rangeStart('1y', now)).toBe('2025-09-25');
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/features/open-data`
Expected: FAIL. The modules are missing, or the JSON import fails until `resolveJsonModule` is on.

- [ ] **Step 4: Implement**

In `tsconfig.app.json`, add `"resolveJsonModule": true` to `compilerOptions`.

`src/features/open-data/schemas.ts`:

```ts
import { z } from 'zod';

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

/** data.gov.my writes timestamps like "2026-09-24 00:01", in Malaysian time (UTC+8). */
const malaysiaDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  .transform((value) => new Date(`${value.replace(' ', 'T')}:00+08:00`).toISOString());

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
      if (parsed.data.series_type === 'level') levels.push(parsed.data);
      else changes.push(parsed.data);
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
```

If the tampered-URL test fails because `pipe` plus `catch` ordering differs in zod 4.6, restructure the chain so that any invalid token falls back to all fuels. Keep the tests as they are.

`src/features/open-data/types.ts`:

```ts
import type { z } from 'zod';
import type {
  CatalogueMetaSchema,
  ChangeRowSchema,
  FUEL_KEYS,
  FUEL_RANGES,
  FuelFiltersSchema,
  FuelPriceResponseSchema,
  LevelRowSchema,
} from './schemas';

export type FuelKey = (typeof FUEL_KEYS)[number];
export type FuelRange = (typeof FUEL_RANGES)[number];
export type LevelRow = z.infer<typeof LevelRowSchema>;
export type ChangeRow = z.infer<typeof ChangeRowSchema>;
export type CatalogueMeta = z.output<typeof CatalogueMetaSchema>;
export type FuelPrices = z.output<typeof FuelPriceResponseSchema>;
export type FuelFilters = z.output<typeof FuelFiltersSchema>;
```

`src/features/open-data/ranges.ts`:

```ts
import type { FuelRange } from './types';

const RANGE_MONTHS: Record<FuelRange, number> = { '3m': 3, '6m': 6, '1y': 12 };

/** First day of the range as YYYY-MM-DD (data.gov.my's date_start format). */
export function rangeStart(range: FuelRange, now = new Date()): string {
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - RANGE_MONTHS[range]);
  return start.toISOString().slice(0, 10);
}
```

`src/test/time.ts`:

```ts
/** Freeze "now" without faking timers, so waitFor and debounces keep working. */
export function pinDate(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

export function unpinDate(): void {
  vi.useRealTimers();
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/features/open-data`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add tsconfig.app.json src/features/open-data src/mocks/fixtures src/test/time.ts
git commit -m "Add the data.gov.my fuel price contract and a recorded fixture"
```

---

### Task 3: The data.gov.my handler and the Dev Panel switch

**Files:**
- Create: `src/mocks/handlers/dataGov.ts`
- Modify: `src/mocks/devControls.ts`, `src/mocks/handlers/index.ts`, `src/app/dev-panel/DevPanel.tsx`, `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`
- Test: `src/mocks/handlers/dataGov.test.ts`, `src/app/dev-panel/DevPanel.test.tsx` (append)

**Interfaces:**
- `DevControls.dataGov: 'live' | 'fixture' | 'rate_limited' | 'not_found' | 'offline'`, plus `DATA_GOV_OPTIONS`.
  - The default is `'fixture'` when `import.meta.env.MODE === 'test'`, otherwise `'live'`.
- `DATA_GOV_CATALOGUE_URL = 'https://api.data.gov.my/data-catalogue/'`
- `dataGovHandlers`:
  - **Live:** `passthrough()`.
  - **Every other mode:** first applies the Dev Panel's latency, then:
    - `fixture`: serves the recorded file, filtered by `date_start`/`date_end`, for `id=fuelprice`. Any other `id` gets data.gov.my's real 404 body shape.
    - `rate_limited`: 429.
    - `not_found`: 404.
    - `offline`: a network error.
  - The Dev Panel's *failure* setting does not apply to data.gov.my; it has its own switch.
- The Dev Panel gets a "data.gov.my" fieldset with one radio per mode. Changing it invalidates queries, like the other controls.

- [ ] **Step 1: Write the failing tests**

`src/mocks/handlers/dataGov.test.ts`:

```ts
import { getDevControls, setDevControls } from '../devControls';
import { DATA_GOV_CATALOGUE_URL } from './dataGov';

const get = (query: string) => fetch(`${DATA_GOV_CATALOGUE_URL}?${query}`);

describe('data.gov.my mock', () => {
  it('serves recorded data by default in tests, never the live API', async () => {
    expect(getDevControls().dataGov).toBe('fixture');
    const response = await get('id=fuelprice&meta=true');
    const body = (await response.json()) as { meta: { catalogue_id: string }; data: unknown[] };
    expect(response.status).toBe(200);
    expect(body.meta.catalogue_id).toBe('fuelprice');
    expect(body.data.length).toBeGreaterThan(80);
  });

  it('filters the recording by date_start and date_end', async () => {
    const response = await get('id=fuelprice&meta=true&date_start=2026-08-01%40date&date_end=2026-08-31%40date');
    const body = (await response.json()) as { data: { date: string }[] };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((row) => row.date >= '2026-08-01' && row.date <= '2026-08-31')).toBe(true);
  });

  it("answers an unknown dataset with data.gov.my's 404 shape", async () => {
    const response = await get('id=nope');
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ status_code: 404 });
  });

  it('can force a rate limit, a missing dataset or an offline network', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    expect((await get('id=fuelprice')).status).toBe(429);

    setDevControls({ dataGov: 'not_found' });
    expect((await get('id=fuelprice')).status).toBe(404);

    setDevControls({ dataGov: 'offline' });
    await expect(get('id=fuelprice')).rejects.toThrow();
  });
});
```

Append to `src/app/dev-panel/DevPanel.test.tsx`:

```tsx
it('switches the data.gov.my source', async () => {
  const { user } = renderPanel();
  await user.click(screen.getByRole('button', { name: /Dev Panel/ }));

  await user.click(screen.getByRole('radio', { name: 'Rate limited (429)' }));

  expect(getDevControls().dataGov).toBe('rate_limited');
});
```

Check that the existing Dev Panel tests still find the toggle by name. The test-mode default is `'fixture'`, which *is* the default in tests, so the panel must not show as "active" there.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/mocks/handlers/dataGov.test.ts src/app/dev-panel`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/mocks/devControls.ts`:

```ts
export const DATA_GOV_OPTIONS = ['live', 'fixture', 'rate_limited', 'not_found', 'offline'] as const;
```

Add `dataGov: z.enum(DATA_GOV_OPTIONS)` to the schema. In `DEFAULT_DEV_CONTROLS`:

```ts
  // Tests must never reach the real API; the running app calls it live by default.
  dataGov: import.meta.env.MODE === 'test' ? 'fixture' : 'live',
```

`src/mocks/handlers/dataGov.ts`:

```ts
import { delay, http, HttpResponse, passthrough } from 'msw';
import { z } from 'zod';
import { assertNever } from '@/shared/lib/assertNever';
import fixture from '../fixtures/fuelprice.json';
import { getDevControls } from '../devControls';

export const DATA_GOV_CATALOGUE_URL = 'https://api.data.gov.my/data-catalogue/';

const RecordingSchema = z.object({
  meta: z.record(z.string(), z.unknown()),
  data: z.array(z.object({ date: z.string() }).loose()),
});
const recording = RecordingSchema.parse(fixture);

/** "2026-08-01@date" -> "2026-08-01" */
const dateParam = (url: URL, name: string) => url.searchParams.get(name)?.split('@')[0];

function recordedResponse(url: URL) {
  const start = dateParam(url, 'date_start') ?? '0000-01-01';
  const end = dateParam(url, 'date_end') ?? '9999-12-31';
  const data = recording.data.filter((row) => row.date >= start && row.date <= end);
  return { meta: { ...recording.meta, total: data.length }, data };
}

const notFound = (id: string) =>
  HttpResponse.json(
    { status_code: 404, details: [`The data catalogue (${id}) requested does not exist.`] },
    { status: 404 },
  );

export const dataGovHandlers = [
  http.get(DATA_GOV_CATALOGUE_URL, async ({ request }) => {
    const { dataGov, latencyMs } = getDevControls();
    // Live: the real request goes out; the browser's Network tab shows the real API.
    if (dataGov === 'live') return passthrough();

    if (latencyMs > 0) await delay(latencyMs);
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';

    switch (dataGov) {
      case 'fixture':
        return id === 'fuelprice' ? HttpResponse.json(recordedResponse(url)) : notFound(id);
      case 'rate_limited':
        return HttpResponse.json({ status_code: 429, details: ['Too many requests'] }, { status: 429 });
      case 'not_found':
        return notFound(id);
      case 'offline':
        return HttpResponse.error();
      default:
        return assertNever(dataGov);
    }
  }),
];
```

In `handlers/index.ts`, spread `...dataGovHandlers` into `handlers`.

Dev Panel: after the "Force a conflict" checkbox, add:

```tsx
          <fieldset className="mb-4">
            <legend className="mb-1 text-body-sm font-medium">{t('devPanel.dataGov.title')}</legend>
            {DATA_GOV_OPTIONS.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-body-sm">
                <input
                  type="radio"
                  name={`${panelId}-data-gov`}
                  checked={controls.dataGov === mode}
                  onChange={() => update({ dataGov: mode })}
                />
                {t(`devPanel.dataGov.${mode}`)}
              </label>
            ))}
          </fieldset>
```

Strings. `en.ts` `devPanel` gets:

```ts
    dataGov: {
      title: 'data.gov.my',
      live: 'Live API',
      fixture: 'Recorded data',
      rate_limited: 'Rate limited (429)',
      not_found: 'Not found (404)',
      offline: 'Offline',
    },
```

`ms.ts`:

```ts
    dataGov: {
      title: 'data.gov.my',
      live: 'API langsung',
      fixture: 'Data rakaman',
      rate_limited: 'Had permintaan (429)',
      not_found: 'Tidak ditemui (404)',
      offline: 'Luar talian',
    },
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src
git commit -m "Mock data.gov.my with live passthrough, a recording and forced errors"
```

---

### Task 4: Client, query, URL filters and page strings

**Files:**
- Create: `src/features/open-data/api/client.ts`, `api/keys.ts`, `api/queries.ts`, `hooks/useFuelFilters.ts`
- Modify: `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`, `src/shared/lib/format.ts`
- Test: `src/features/open-data/api/queries.test.tsx`, `src/features/open-data/hooks/useFuelFilters.test.tsx`, `src/shared/lib/format.test.ts` (append)

**Interfaces:**
- `dataGovClient = createApiClient({ baseUrl: 'https://api.data.gov.my' })`
- `openDataKeys.all`, and `openDataKeys.fuelPrices(range, dateStart)`
- `useFuelPrices(range)` returns `UseQueryResult<FuelPrices, Error>`. It:
  - fetches `/data-catalogue/` with `id=fuelprice`, `date_start=<rangeStart>@date`, `sort=date` and `meta=true`
  - uses `keepPreviousData`
  - has a `staleTime` that lasts until `meta.next_update`
- `useFuelFilters()` returns `{ range, fuels, setRange(range), toggleFuel(key) }`.
  - It keeps the filters in the URL and leaves default values out.
  - Changes use `replace`.
  - Toggling keeps the fixed fuel order.
- `formatPrice(value, language)` gives two decimals, e.g. "4.57". `formatMonthYear(isoDate, language)` gives e.g. "Mar 2026".
- All `fuel.*` strings and `app.nav.fuel` (below).

- [ ] **Step 1: Write the failing tests**

`src/features/open-data/api/queries.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { setDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { pinDate, unpinDate } from '@/test/time';
import { useFuelPrices } from './queries';

describe('useFuelPrices', () => {
  beforeEach(() => pinDate('2026-09-25T00:00:00.000Z'));
  afterEach(unpinDate);

  it('loads validated price levels for the chosen range', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFuelPrices('3m'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const levels = result.current.data?.levels ?? [];
    expect(levels.length).toBeGreaterThan(10);
    expect(levels[0]!.date >= '2026-06-25').toBe(true);
    expect(result.current.data?.meta.data_source).toContain('MOF');
  });

  it('surfaces a rate limit as an http 429 ApiError without retrying', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFuelPrices('6m'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ kind: 'http', status: 429 });
  });
});
```

`src/features/open-data/hooks/useFuelFilters.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { useFuelFilters } from './useFuelFilters';

function Probe() {
  const { range, fuels, setRange, toggleFuel } = useFuelFilters();
  return (
    <>
      <output aria-label="filters">{JSON.stringify({ range, fuels })}</output>
      <button onClick={() => setRange('1y')}>1y</button>
      <button onClick={() => toggleFuel('ron97')}>toggle ron97</button>
    </>
  );
}

const renderProbe = (url = '/') => renderRoutes([{ path: '/', Component: Probe }], { initialEntries: [url] });
const state = () => JSON.parse(screen.getByRole('status', { name: 'filters' }).textContent ?? '') as unknown;

describe('useFuelFilters', () => {
  it('defaults to six months and every fuel, with a clean URL', () => {
    const { router } = renderProbe();
    expect(state()).toEqual({ range: '6m', fuels: ['ron95', 'ron97', 'diesel', 'ron95_budi95'] });
    expect(router.state.location.search).toBe('');
  });

  it('writes the range and fuel toggles to the URL, keeping palette order', async () => {
    const { user, router } = renderProbe('/?fuels=diesel');
    await user.click(screen.getByRole('button', { name: 'toggle ron97' }));
    await user.click(screen.getByRole('button', { name: '1y' }));

    expect(state()).toEqual({ range: '1y', fuels: ['ron97', 'diesel'] });
    expect(new URLSearchParams(router.state.location.search).get('fuels')).toBe('ron97,diesel');
  });

  it('removes a fuel that is already shown', async () => {
    const { user } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'toggle ron97' }));
    expect(state()).toMatchObject({ fuels: ['ron95', 'diesel', 'ron95_budi95'] });
  });
});
```

Append to `src/shared/lib/format.test.ts`:

```ts
describe('formatPrice and formatMonthYear', () => {
  it('shows prices with two decimals and removes float noise', () => {
    expect(formatPrice(4.57, 'en')).toBe('4.57');
    expect(formatPrice(0.35000000000000053, 'en')).toBe('0.35');
    expect(formatPrice(2, 'ms')).toBe('2.00');
  });

  it('labels months for chart axes', () => {
    expect(formatMonthYear('2026-03-05', 'en')).toMatch(/Mar/);
    expect(formatMonthYear('2026-03-05', 'en')).toMatch(/2026/);
  });
});
```

(Import `formatPrice` and `formatMonthYear` alongside the existing helpers.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/open-data src/shared/lib`
Expected: FAIL.

- [ ] **Step 3: Implement**

`api/client.ts`:

```ts
import { createApiClient } from '@/shared/api/client';

/** Same validation and error mapping as the app's own API, pointed at data.gov.my. */
export const dataGovClient = createApiClient({ baseUrl: 'https://api.data.gov.my' });
```

`api/keys.ts`:

```ts
import type { FuelRange } from '../types';

export const openDataKeys = {
  all: ['open-data'] as const,
  fuelPrices: (range: FuelRange, dateStart: string) =>
    [...openDataKeys.all, 'fuelprice', range, dateStart] as const,
};
```

`api/queries.ts`:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { rangeStart } from '../ranges';
import { FuelPriceResponseSchema } from '../schemas';
import type { FuelRange } from '../types';
import { dataGovClient } from './client';
import { openDataKeys } from './keys';

export function useFuelPrices(range: FuelRange) {
  const dateStart = rangeStart(range);
  return useQuery({
    queryKey: openDataKeys.fuelPrices(range, dateStart),
    queryFn: ({ signal }) =>
      // The trailing slash matters: without it data.gov.my answers with a redirect.
      dataGovClient.get('/data-catalogue/', FuelPriceResponseSchema, {
        params: { id: 'fuelprice', date_start: `${dateStart}@date`, sort: 'date', meta: 'true' },
        signal,
      }),
    placeholderData: keepPreviousData,
    // Weekly data: no point refetching before the publisher's next scheduled update.
    staleTime: (query) => {
      const nextUpdate = query.state.data?.meta.next_update;
      return nextUpdate ? Math.max(0, Date.parse(nextUpdate) - Date.now()) : 0;
    },
  });
}
```

`hooks/useFuelFilters.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { FUEL_KEYS, FuelFiltersSchema } from '../schemas';
import type { FuelFilters, FuelKey, FuelRange } from '../types';

const DEFAULTS = FuelFiltersSchema.parse({});

function toSearchParams({ range, fuels }: FuelFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (range !== DEFAULTS.range) params.set('range', range);
  if (fuels.join(',') !== DEFAULTS.fuels.join(',')) params.set('fuels', fuels.join(','));
  return params;
}

const parse = (params: URLSearchParams) => FuelFiltersSchema.parse(Object.fromEntries(params));

/** Range and visible fuels live in the URL, so a chart view can be shared. */
export function useFuelFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<FuelFilters>) => {
      // replace: flipping filters should not fill the Back history.
      void setSearchParams((previous) => toSearchParams({ ...parse(previous), ...patch }), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const setRange = useCallback((range: FuelRange) => update({ range }), [update]);
  const toggleFuel = useCallback(
    (key: FuelKey) =>
      update({
        fuels: FUEL_KEYS.filter((fuel) => (fuel === key ? !filters.fuels.includes(fuel) : filters.fuels.includes(fuel))),
      }),
    [filters.fuels, update],
  );

  return { ...filters, setRange, toggleFuel };
}
```

`src/shared/lib/format.ts`:

```ts
const locale = (language: string) => (language === 'ms' ? 'ms-MY' : 'en-MY');

/** Two decimals; also removes float noise such as 0.35000000000000053. */
export function formatPrice(value: number, language: string): string {
  return new Intl.NumberFormat(locale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMonthYear(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(isoDate));
}
```

Reuse the `locale` helper in the existing `formatDate` and `formatDateTime` if that is a clean change. Do not change their output.

Strings. Add `fuel: 'Fuel prices'` to `app.nav` in `en.ts`, and a new top-level `fuel` object:

```ts
  fuel: {
    title: 'Fuel prices',
    intro: 'Weekly retail fuel prices in Malaysia, published by the Ministry of Finance on data.gov.my.',
    series: {
      ron95: 'RON95',
      ron97: 'RON97',
      diesel: 'Diesel',
      ron95_budi95: 'RON95 (BUDI95)',
    },
    range: { label: 'Date range', '3m': '3 months', '6m': '6 months', '1y': '1 year' },
    fuels: { label: 'Fuels shown', none: 'Choose at least one fuel to show the chart.' },
    price: 'RM {{value}}',
    unit: 'RM per litre',
    chart: {
      label: 'Weekly fuel prices, {{range}}',
      loading: 'Loading fuel prices…',
      instructions: 'Use the left and right arrow keys to read each week. Home and End jump to the first and last week.',
      summary: '{{fuel}} went from RM {{from}} to RM {{to}}.',
    },
    latest: {
      title: 'Latest weeks',
      caption: 'Prices for the latest weeks, with the change from the week before',
      week: 'Week of',
      up: 'up RM {{value}}',
      down: 'down RM {{value}}',
      same: 'no change',
    },
    table: {
      show: 'Show the chart data as a table',
      caption: 'Weekly fuel prices, RM per litre',
      week: 'Week of',
    },
    freshness: {
      asOf: 'Data as of {{date}}',
      next: 'Next update {{date}}',
      source: 'Source: {{source}} via data.gov.my',
      link: 'View this dataset on data.gov.my',
    },
    skipped_one: '{{count}} row had an unexpected format and is not shown.',
    skipped_other: '{{count}} rows had an unexpected format and are not shown.',
    errorTitle: "Couldn't load fuel prices",
  },
```

`ms.ts`: add `fuel: 'Harga bahan api'` to `app.nav`, and:

```ts
  fuel: {
    title: 'Harga bahan api',
    intro: 'Harga runcit bahan api mingguan di Malaysia, diterbitkan oleh Kementerian Kewangan di data.gov.my.',
    series: {
      ron95: 'RON95',
      ron97: 'RON97',
      diesel: 'Diesel',
      ron95_budi95: 'RON95 (BUDI95)',
    },
    range: { label: 'Julat tarikh', '3m': '3 bulan', '6m': '6 bulan', '1y': '1 tahun' },
    fuels: { label: 'Bahan api dipaparkan', none: 'Pilih sekurang-kurangnya satu bahan api untuk memaparkan carta.' },
    price: 'RM {{value}}',
    unit: 'RM seliter',
    chart: {
      label: 'Harga bahan api mingguan, {{range}}',
      loading: 'Memuatkan harga bahan api…',
      instructions: 'Gunakan kekunci anak panah kiri dan kanan untuk membaca setiap minggu. Home dan End melompat ke minggu pertama dan terakhir.',
      summary: '{{fuel}} berubah daripada RM {{from}} kepada RM {{to}}.',
    },
    latest: {
      title: 'Minggu terkini',
      caption: 'Harga bagi minggu terkini, dengan perubahan berbanding minggu sebelumnya',
      week: 'Minggu',
      up: 'naik RM {{value}}',
      down: 'turun RM {{value}}',
      same: 'tiada perubahan',
    },
    table: {
      show: 'Tunjukkan data carta sebagai jadual',
      caption: 'Harga bahan api mingguan, RM seliter',
      week: 'Minggu',
    },
    freshness: {
      asOf: 'Data setakat {{date}}',
      next: 'Kemas kini seterusnya {{date}}',
      source: 'Sumber: {{source}} melalui data.gov.my',
      link: 'Lihat set data ini di data.gov.my',
    },
    skipped_one: '{{count}} baris mempunyai format yang tidak dijangka dan tidak dipaparkan.',
    skipped_other: '{{count}} baris mempunyai format yang tidak dijangka dan tidak dipaparkan.',
    errorTitle: 'Harga bahan api tidak dapat dimuatkan',
  },
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src
git commit -m "Add the fuel price query, URL filters and page strings"
```

---

### Task 5: Chart geometry (pure functions)

**Files:**
- Create: `src/features/open-data/chart/geometry.ts`, `src/shared/hooks/useElementWidth.ts`
- Test: `src/features/open-data/chart/geometry.test.ts`

**Interfaces** (all pure, no React):
- `linearScale([d0, d1], [r0, r1]): (v: number) => number`
- `niceDomain(values, step = 0.5): [number, number]`: rounded outward to whole steps, never zero-width.
- `ticks([lo, hi], step = 0.5): number[]`
- `segmentPath(points: ({ x; y } | null)[]): string`: an SVG path in which a `null` starts a new segment.
- `nearestIndex(xs: number[], x: number): number`
- `layoutEndLabels(items: { key: string; y: number }[], gap: number, [min, max]: [number, number]): Record<string, number>`: label y positions at least `gap` apart and inside `[min, max]`, keeping the original order.
- `monthTickIndexes(dates: string[], maxTicks: number): number[]`: the index of the first week of each month, thinned to at most `maxTicks`.
- `useElementWidth(ref, fallback)`: the width from a `ResizeObserver`, or `fallback` until the first measurement (jsdom stays on the fallback).

- [ ] **Step 1: Write the failing tests**

`src/features/open-data/chart/geometry.test.ts`:

```ts
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
    const dates = ['2026-01-01', '2026-01-08', '2026-02-05', '2026-02-12', '2026-03-05', '2026-04-02'];
    expect(monthTickIndexes(dates, 10)).toEqual([0, 2, 4, 5]);
    expect(monthTickIndexes(dates, 2)).toEqual([0, 4]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/open-data/chart`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/features/open-data/chart/geometry.ts`:

```ts
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
  const lo = Math.floor(Math.min(...values) / step) * step;
  let hi = Math.ceil(Math.max(...values) / step) * step;
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

/** Keep end labels at least `gap` apart and inside [min, max], preserving their order. */
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
  const firsts = dates.flatMap((date, i) =>
    i === 0 || date.slice(0, 7) !== dates[i - 1]!.slice(0, 7) ? [i] : [],
  );
  if (firsts.length <= maxTicks) return firsts;
  const every = Math.ceil(firsts.length / Math.max(maxTicks, 1));
  return firsts.filter((_, i) => i % every === 0);
}
```

`src/shared/hooks/useElementWidth.ts`:

```ts
import { useLayoutEffect, useState, type RefObject } from 'react';

/** The element's rendered width; `fallback` until the first ResizeObserver callback. */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    // ResizeObserver reports the initial size on observe(), then every change.
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/open-data/chart`
Expected: PASS. If `monthTickIndexes` thinning gives a different but equally valid selection, keep the rule "first-of-month ticks, at most `maxTicks`" and fix the implementation, not the expectations.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/features/open-data/chart src/shared/hooks/useElementWidth.ts
git commit -m "Add pure chart geometry helpers and an element width hook"
```

---

### Task 6: The fuel price chart

**Files:**
- Create: `src/features/open-data/components/FuelPriceChart.tsx`, `src/features/open-data/components/FuelFilters.tsx`
- Modify: `src/index.css` (palette)
- Test: `src/features/open-data/components/FuelPriceChart.test.tsx`, `src/features/open-data/components/FuelFilters.test.tsx`

**Interfaces:**
- `FuelFilters({ range, fuels, onRangeChange, onToggleFuel })`: one row above the chart. It has:
  - A range group of buttons with `aria-pressed`.
  - A fuel group of toggle buttons with `aria-pressed`, each showing a 12×2px line key in the fuel colour and the translated fuel name. This group is the legend.
  - Each group has a label.
- `FuelPriceChart({ levels, fuels, rangeLabel })`:
  - **Wrapper:** a focusable `role="group"` div, named by `t('fuel.chart.label', { range: rangeLabel })` and described by the instructions and a text summary (`fuel.chart.summary` per visible fuel: first value to last value). The SVG itself is `aria-hidden`.
  - **Marks:** 1px gridlines and y-ticks in steps of RM 0.50, month ticks on x, and one 2px path per visible fuel (`data-fuel={key}`, stroke `var(--fuel-<key>)`). End dots have r=4 and a 2px surface ring. Direct end labels ("RON95 RM 4.57") appear when the chart is 480px or wider.
  - **Hover:** a transparent overlay rect. `pointermove` snaps the active week with `nearestIndex`; `pointerleave` clears it. The active week shows a crosshair, a dot per series and an HTML tooltip (the date as the header, then rows sorted by value, the value in bold first, then the name, keyed with a line).
  - **Keyboard:** with the wrapper focused, Left and Right move one week, Home and End jump to the first and last week, and Escape clears. Focusing starts at the last week, and blur clears.
  - **Screen readers:** a polite live region repeats the active week's readout in text.

- [ ] **Step 1: Add the palette** to the end of `src/index.css`:

```css
/*
 * Categorical data palette for the fuel chart (dataviz reference slots 1-4),
 * validated with the dataviz validator on MYDS surfaces: light #ffffff, dark #18181b.
 * MYDS has no categorical data palette, so this is the one non-MYDS colour set.
 */
.fuel-chart {
  --chart-surface: #ffffff;
  --fuel-ron95: #2a78d6;
  --fuel-ron97: #eb6834;
  --fuel-diesel: #1baf7a;
  --fuel-ron95_budi95: #eda100;
}

.dark .fuel-chart {
  --chart-surface: #18181b;
  --fuel-ron95: #3987e5;
  --fuel-ron97: #d95926;
  --fuel-diesel: #199e70;
  --fuel-ron95_budi95: #c98500;
}
```

- [ ] **Step 2: Write the failing tests**

`src/features/open-data/components/FuelFilters.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FuelFilters } from './FuelFilters';

describe('FuelFilters', () => {
  it('shows the active range and fuels as pressed toggles and reports changes', async () => {
    const onRangeChange = vi.fn();
    const onToggleFuel = vi.fn();
    const user = userEvent.setup();
    render(
      <FuelFilters range="6m" fuels={['ron95', 'diesel']} onRangeChange={onRangeChange} onToggleFuel={onToggleFuel} />,
    );

    const ranges = screen.getByRole('group', { name: 'Date range' });
    expect(screen.getByRole('button', { name: '6 months' })).toHaveAttribute('aria-pressed', 'true');
    expect(ranges).toContainElement(screen.getByRole('button', { name: '1 year' }));
    expect(screen.getByRole('button', { name: 'RON97' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: '1 year' }));
    await user.click(screen.getByRole('button', { name: 'RON97' }));

    expect(onRangeChange).toHaveBeenCalledWith('1y');
    expect(onToggleFuel).toHaveBeenCalledWith('ron97');
  });
});
```

`src/features/open-data/components/FuelPriceChart.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { FuelPriceResponseSchema } from '../schemas';
import { FuelPriceChart } from './FuelPriceChart';

const { levels } = FuelPriceResponseSchema.parse(fixture);
const recent = levels.slice(-8);
const last = recent.at(-1)!;
const previous = recent.at(-2)!;

function renderChart(fuels = ['ron95', 'ron97', 'diesel', 'ron95_budi95'] as const) {
  const user = userEvent.setup();
  const utils = render(<FuelPriceChart levels={recent} fuels={fuels} rangeLabel="3 months" />);
  return { ...utils, user, chart: screen.getByRole('group', { name: 'Weekly fuel prices, 3 months' }) };
}

describe('FuelPriceChart', () => {
  it('draws one line per visible fuel and labels each line end directly', () => {
    const { container } = renderChart(['ron95', 'diesel']);
    expect([...container.querySelectorAll('path[data-fuel]')].map((p) => p.getAttribute('data-fuel'))).toEqual([
      'ron95',
      'diesel',
    ]);
    expect(screen.getByText(`RON95 RM ${last.ron95.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`Diesel RM ${last.diesel.toFixed(2)}`)).toBeInTheDocument();
  });

  it('describes the trend in text for screen readers', () => {
    const { chart } = renderChart(['ron95']);
    expect(chart).toHaveAccessibleDescription(
      expect.stringContaining(`RON95 went from RM ${recent[0]!.ron95.toFixed(2)} to RM ${last.ron95.toFixed(2)}.`),
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
    expect(container.querySelector('path[data-fuel="ron97"]')).toHaveStyle({ stroke: 'var(--fuel-ron97)' });
  });
});
```

The palette test asserts an inline style because colour-follows-the-fuel is a correctness rule, not a styling detail. If `toHaveStyle` can't read a `var()` in jsdom, assert the `style` attribute contains `var(--fuel-ron97)`.

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/features/open-data/components`
Expected: FAIL.

- [ ] **Step 4: Implement `FuelFilters`**

```tsx
import { Button } from '@govtechmy/myds-react/button';
import { useTranslation } from 'react-i18next';
import { FUEL_KEYS, FUEL_RANGES } from '../schemas';
import type { FuelKey, FuelRange } from '../types';

type FuelFiltersProps = {
  range: FuelRange;
  fuels: readonly FuelKey[];
  onRangeChange: (range: FuelRange) => void;
  onToggleFuel: (fuel: FuelKey) => void;
};

/** One row above the chart. The fuel toggles double as the legend. */
export function FuelFilters({ range, fuels, onRangeChange, onToggleFuel }: FuelFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div role="group" aria-label={t('fuel.range.label')} className="flex flex-wrap gap-2">
        {FUEL_RANGES.map((option) => (
          <Button
            key={option}
            size="small"
            variant={option === range ? 'primary-fill' : 'default-outline'}
            aria-pressed={option === range}
            onClick={() => onRangeChange(option)}
          >
            {t(`fuel.range.${option}`)}
          </Button>
        ))}
      </div>
      <div role="group" aria-label={t('fuel.fuels.label')} className="flex flex-wrap gap-2">
        {FUEL_KEYS.map((fuel) => {
          const shown = fuels.includes(fuel);
          return (
            <Button
              key={fuel}
              size="small"
              variant={shown ? 'default-outline' : 'default-ghost'}
              aria-pressed={shown}
              onClick={() => onToggleFuel(fuel)}
              className={shown ? undefined : 'opacity-60'}
            >
              <span
                aria-hidden="true"
                className="fuel-chart inline-block h-0.5 w-3 rounded-full"
                style={{ backgroundColor: `var(--fuel-${fuel})` }}
              />
              {t(`fuel.series.${fuel}`)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement `FuelPriceChart`**

```tsx
import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useElementWidth } from '@/shared/hooks/useElementWidth';
import { formatDate, formatMonthYear, formatPrice } from '@/shared/lib/format';
import {
  layoutEndLabels,
  linearScale,
  monthTickIndexes,
  nearestIndex,
  niceDomain,
  segmentPath,
  ticks,
} from '../chart/geometry';
import type { FuelKey, LevelRow } from '../types';

const HEIGHT = 300;
const LABEL_GAP = 16;
const DIRECT_LABEL_MIN_WIDTH = 480;

type FuelPriceChartProps = {
  levels: readonly LevelRow[];
  fuels: readonly FuelKey[];
  rangeLabel: string;
};

export function FuelPriceChart({ levels, fuels, rangeLabel }: FuelPriceChartProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = useElementWidth(containerRef, 720);
  const [active, setActive] = useState<number | null>(null);
  const instructionsId = useId();
  const summaryId = useId();

  const showDirectLabels = width >= DIRECT_LABEL_MIN_WIDTH;
  const margin = { top: 16, right: showDirectLabels ? 136 : 16, bottom: 32, left: 48 };
  const lang = i18n.language;
  const price = (value: number) => t('fuel.price', { value: formatPrice(value, lang) });

  const geometry = useMemo(() => {
    const plotRight = width - margin.right;
    const plotBottom = HEIGHT - margin.bottom;
    const values = levels.flatMap((row) => fuels.flatMap((fuel) => (row[fuel] === null ? [] : [row[fuel]])));
    const domain = niceDomain(values);
    const x = linearScale([0, Math.max(levels.length - 1, 1)], [margin.left, plotRight]);
    const y = linearScale(domain, [plotBottom, margin.top]);
    const xs = levels.map((_, i) => x(i));
    const series = fuels.map((fuel) => {
      const points = levels.map((row, i) => (row[fuel] === null ? null : { x: xs[i]!, y: y(row[fuel]) }));
      const lastIndex = levels.findLastIndex((row) => row[fuel] !== null);
      return { fuel, points, lastIndex };
    });
    const labelY = layoutEndLabels(
      series.flatMap((s) => (s.lastIndex < 0 ? [] : [{ key: s.fuel, y: s.points[s.lastIndex]!.y }])),
      LABEL_GAP,
      [margin.top, plotBottom],
    );
    const maxTicks = Math.max(1, Math.floor((plotRight - margin.left) / 72));
    return { plotRight, plotBottom, domain, y, xs, series, labelY, monthTicks: monthTickIndexes(levels.map((r) => r.date), maxTicks) };
  }, [width, levels, fuels, margin.left, margin.right, margin.top, margin.bottom]);

  const activeRow = active === null ? undefined : levels[active];
  const readout = activeRow
    ? [
        formatDate(activeRow.date, lang),
        ...fuels
          .filter((fuel) => activeRow[fuel] !== null)
          .sort((a, b) => (activeRow[b] ?? 0) - (activeRow[a] ?? 0))
          .map((fuel) => `${t(`fuel.series.${fuel}`)} ${price(activeRow[fuel] ?? 0)}`),
      ].join(', ')
    : '';

  const summary = fuels
    .flatMap((fuel) => {
      const values = levels.flatMap((row) => (row[fuel] === null ? [] : [row[fuel]]));
      const first = values[0];
      const lastValue = values.at(-1);
      return first === undefined || lastValue === undefined
        ? []
        : [t('fuel.chart.summary', { fuel: t(`fuel.series.${fuel}`), from: formatPrice(first, lang), to: formatPrice(lastValue, lang) })];
    })
    .join(' ');

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const left = svgRef.current?.getBoundingClientRect().left ?? 0;
    const index = nearestIndex(geometry.xs, event.clientX - left);
    setActive(index < 0 ? null : index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = levels.length - 1;
    const current = active ?? lastIndex;
    const next =
      event.key === 'ArrowLeft' ? Math.max(0, current - 1)
      : event.key === 'ArrowRight' ? Math.min(lastIndex, current + 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? lastIndex
      : undefined;
    if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  }

  const activeX = active === null ? undefined : geometry.xs[active];
  const tooltipOnLeft = activeX !== undefined && activeX > width - 200;

  return (
    <div
      ref={containerRef}
      role="group"
      tabIndex={0}
      aria-label={t('fuel.chart.label', { range: rangeLabel })}
      aria-describedby={`${instructionsId} ${summaryId}`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((current) => current ?? levels.length - 1)}
      onBlur={() => setActive(null)}
      className="fuel-chart relative rounded-md focus-visible:outline-none focus-visible:ring focus-visible:ring-fr-primary"
    >
      <p id={instructionsId} className="sr-only">{t('fuel.chart.instructions')}</p>
      <p id={summaryId} className="sr-only">{summary}</p>
      <p role="status" aria-live="polite" className="sr-only">{readout}</p>

      <svg ref={svgRef} width={width} height={HEIGHT} aria-hidden="true" className="block max-w-full">
        {ticks(geometry.domain).map((value) => (
          <g key={value}>
            <line
              x1={margin.left}
              x2={geometry.plotRight}
              y1={geometry.y(value)}
              y2={geometry.y(value)}
              className="stroke-otl-divider"
              strokeWidth={1}
            />
            <text x={margin.left - 8} y={geometry.y(value)} dy="0.32em" textAnchor="end" className="fill-txt-black-500 text-body-xs">
              {formatPrice(value, lang)}
            </text>
          </g>
        ))}
        {geometry.monthTicks.map((index) => (
          <text
            key={index}
            x={geometry.xs[index]}
            y={HEIGHT - 10}
            textAnchor="middle"
            className="fill-txt-black-500 text-body-xs"
          >
            {formatMonthYear(levels[index]!.date, lang)}
          </text>
        ))}

        {geometry.series.map(({ fuel, points }) => (
          <path
            key={fuel}
            data-fuel={fuel}
            d={segmentPath(points)}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: `var(--fuel-${fuel})` }}
          />
        ))}

        {geometry.series.map(({ fuel, points, lastIndex }) => {
          const end = lastIndex < 0 ? null : points[lastIndex];
          if (!end) return null;
          const labelY = geometry.labelY[fuel] ?? end.y;
          const value = levels[lastIndex]![fuel] ?? 0;
          return (
            <g key={`end-${fuel}`}>
              <circle cx={end.x} cy={end.y} r={4} strokeWidth={2} style={{ fill: `var(--fuel-${fuel})`, stroke: 'var(--chart-surface)' }} />
              {showDirectLabels && (
                <>
                  {Math.abs(labelY - end.y) > 1 && (
                    <line x1={end.x + 6} y1={end.y} x2={geometry.plotRight + 8} y2={labelY} className="stroke-otl-gray-300" strokeWidth={1} />
                  )}
                  <text x={geometry.plotRight + 12} y={labelY} dy="0.32em" className="fill-txt-black-900 text-body-xs font-medium">
                    {`${t(`fuel.series.${fuel}`)} ${price(value)}`}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {activeX !== undefined && activeRow && (
          <g>
            <line x1={activeX} x2={activeX} y1={margin.top} y2={geometry.plotBottom} className="stroke-otl-gray-300" strokeWidth={1} />
            {fuels.map((fuel) =>
              activeRow[fuel] === null ? null : (
                <circle
                  key={fuel}
                  cx={activeX}
                  cy={geometry.y(activeRow[fuel])}
                  r={4}
                  strokeWidth={2}
                  style={{ fill: `var(--fuel-${fuel})`, stroke: 'var(--chart-surface)' }}
                />
              ),
            )}
          </g>
        )}

        <rect
          x={margin.left}
          y={margin.top}
          width={Math.max(geometry.plotRight - margin.left, 0)}
          height={Math.max(geometry.plotBottom - margin.top, 0)}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activeX !== undefined && activeRow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 min-w-40 rounded-md border border-otl-gray-200 bg-bg-white p-2 text-body-xs shadow-card"
          style={tooltipOnLeft ? { right: width - activeX + 12 } : { left: activeX + 12 }}
        >
          <p className="mb-1 text-txt-black-500">{formatDate(activeRow.date, lang)}</p>
          {fuels
            .filter((fuel) => activeRow[fuel] !== null)
            .sort((a, b) => (activeRow[b] ?? 0) - (activeRow[a] ?? 0))
            .map((fuel) => (
              <p key={fuel} className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: `var(--fuel-${fuel})` }} />
                <strong className="text-txt-black-900">{price(activeRow[fuel] ?? 0)}</strong>
                <span className="text-txt-black-500">{t(`fuel.series.${fuel}`)}</span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
```

Notes for the implementer:
- `row[fuel]` is typed `number | null` for every `FuelKey` (`ron95`, `ron97` and `diesel` are plain `number`, which still fits). If TypeScript cannot narrow `row[fuel]` after the `!== null` checks inside the JSX, read it into a local `const value = row[fuel]` first. Never cast.
- If `findLastIndex` is not in the configured `lib` (ES2022 does not include it), add `"ES2023.Array"` to `lib` in `tsconfig.app.json`, or write a small loop. Report which one you chose.
- `useMemo` depends on the individual margin numbers, not on the `margin` object, which is recreated every render.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/open-data/components`
Expected: PASS, with no React warnings.

- [ ] **Step 7: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/index.css src/features/open-data/components
git commit -m "Add an accessible SVG fuel price chart with a legend of fuel toggles"
```

---

### Task 7: Latest weeks, data table and freshness footer

**Files:**
- Create: `src/features/open-data/components/LatestPricesTable.tsx`, `ChartDataTable.tsx`, `DataFreshness.tsx`
- Test: `LatestPricesTable.test.tsx`, `ChartDataTable.test.tsx`, `DataFreshness.test.tsx` (same folder)

**Interfaces:**
- `LatestPricesTable({ levels, changes, fuels, weeks = 6 })`: a MYDS table captioned `fuel.latest.caption`, newest week first. Each fuel cell shows the price, then the change from the matching `change_weekly` row on the same date:
  - an up or down arrow icon (`aria-hidden`) plus the amount, with a screen-reader text of "up RM 0.20", "down RM 0.20" or "no change" (a change under 0.005 counts as none)
  - neutral text colour: a price change is not a status
- `ChartDataTable({ levels, fuels })`: a native `<details>` with a `<summary>` of `fuel.table.show` and a MYDS table of every plotted week (newest first).
- `DataFreshness({ meta })`: a footer reading "Data as of …" (date and time), "Next update …" (date), and "Source: MOF via data.gov.my", plus a link to `https://data.gov.my/data-catalogue/fuelprice`.

- [ ] **Step 1: Write the failing tests**

`LatestPricesTable.test.tsx`:

```tsx
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
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Week of', 'RON95', 'Diesel']);

    const firstBody = rows[1]!;
    expect(firstBody).toHaveTextContent(`RM ${newest.ron95.toFixed(2)}`);
    const direction = change.ron95 > 0.005 ? 'up' : change.ron95 < -0.005 ? 'down' : 'no change';
    expect(firstBody).toHaveTextContent(direction === 'no change' ? 'no change' : `${direction} RM ${Math.abs(change.ron95).toFixed(2)}`);
  });
});
```

`ChartDataTable.test.tsx`:

```tsx
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
  expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Week of', 'RON97']);
});
```

`DataFreshness.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DataFreshness } from './DataFreshness';

it('credits the source and says how fresh the data is', () => {
  render(
    <DataFreshness
      meta={{
        catalogue_id: 'fuelprice',
        data_as_of: '2026-09-23T16:01:00.000Z',
        last_updated: '2026-09-23T15:59:00.000Z',
        next_update: '2026-09-30T15:59:00.000Z',
        data_source: ['MOF'],
        update_frequency: 'WEEKLY',
      }}
    />,
  );

  expect(screen.getByText(/Data as of 24 Sep/)).toBeInTheDocument();
  expect(screen.getByText(/Next update 30 Sep/)).toBeInTheDocument();
  expect(screen.getByText('Source: MOF via data.gov.my')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View this dataset on data.gov.my' })).toHaveAttribute(
    'href',
    'https://data.gov.my/data-catalogue/fuelprice',
  );
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/open-data/components`
Expected: FAIL for the three new files.

- [ ] **Step 3: Implement**

`LatestPricesTable.tsx`:

```tsx
import { ArrowDownIcon, ArrowUpIcon } from '@govtechmy/myds-react/icon';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@govtechmy/myds-react/table';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPrice } from '@/shared/lib/format';
import type { ChangeRow, FuelKey, LevelRow } from '../types';

type LatestPricesTableProps = {
  levels: readonly LevelRow[];
  changes: readonly ChangeRow[];
  fuels: readonly FuelKey[];
  weeks?: number;
};

export function LatestPricesTable({ levels, changes, fuels, weeks = 6 }: LatestPricesTableProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const changeByDate = new Map(changes.map((row) => [row.date, row]));
  const rows = levels.slice(-weeks).reverse();

  return (
    <section aria-labelledby="latest-heading" className="flex flex-col gap-2">
      <h2 id="latest-heading" className="font-heading text-body-lg font-semibold">
        {t('fuel.latest.title')}
      </h2>
      <Table>
        <TableCaption className="sr-only">{t('fuel.latest.caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fuel.latest.week')}</TableHead>
            {fuels.map((fuel) => (
              <TableHead key={fuel}>{t(`fuel.series.${fuel}`)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date}>
              <TableCell className="whitespace-nowrap">{formatDate(row.date, lang)}</TableCell>
              {fuels.map((fuel) => {
                const value = row[fuel];
                return (
                  <TableCell key={fuel} className="whitespace-nowrap">
                    {value === null ? '—' : t('fuel.price', { value: formatPrice(value, lang) })}
                    <Change delta={changeByDate.get(row.date)?.[fuel] ?? null} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

/** Direction by icon and words, not colour: a price change is not a status. */
function Change({ delta }: { delta: number | null }) {
  const { t, i18n } = useTranslation();
  if (delta === null) return null;
  const amount = formatPrice(Math.abs(delta), i18n.language);
  if (Math.abs(delta) < 0.005) {
    return <span className="ml-2 text-body-xs text-txt-black-500">{t('fuel.latest.same')}</span>;
  }
  const up = delta > 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className="ml-2 inline-flex items-center gap-0.5 text-body-xs text-txt-black-500">
      <Icon aria-hidden="true" className="size-3" />
      <span className="sr-only">{up ? t('fuel.latest.up', { value: amount }) : t('fuel.latest.down', { value: amount })}</span>
      <span aria-hidden="true">{amount}</span>
    </span>
  );
}
```

The test reads the row's text content, which includes the `sr-only` text. If `toHaveTextContent` also sees the `aria-hidden` amount (e.g. "up RM 0.200.20"), keep the assertion as `toHaveTextContent(<expected phrase>)`: that is a substring match, so it still passes.

`ChartDataTable.tsx`:

```tsx
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@govtechmy/myds-react/table';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPrice } from '@/shared/lib/format';
import type { FuelKey, LevelRow } from '../types';

/** The table view: every value the chart plots, reachable without hovering. */
export function ChartDataTable({ levels, fuels }: { levels: readonly LevelRow[]; fuels: readonly FuelKey[] }) {
  const { t, i18n } = useTranslation();
  return (
    <details className="rounded-md border border-otl-divider p-3">
      <summary className="cursor-pointer text-body-sm font-medium text-txt-primary">{t('fuel.table.show')}</summary>
      <Table className="mt-3">
        <TableCaption className="sr-only">{t('fuel.table.caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('fuel.table.week')}</TableHead>
            {fuels.map((fuel) => (
              <TableHead key={fuel}>{t(`fuel.series.${fuel}`)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...levels].reverse().map((row) => (
            <TableRow key={row.date}>
              <TableCell className="whitespace-nowrap">{formatDate(row.date, i18n.language)}</TableCell>
              {fuels.map((fuel) => {
                const value = row[fuel];
                return (
                  <TableCell key={fuel}>{value === null ? '—' : formatPrice(value, i18n.language)}</TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  );
}
```

`DataFreshness.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import type { CatalogueMeta } from '../types';

export const FUEL_DATASET_URL = 'https://data.gov.my/data-catalogue/fuelprice';

export function DataFreshness({ meta }: { meta: CatalogueMeta }) {
  const { t, i18n } = useTranslation();
  return (
    <footer className="flex flex-col gap-1 border-t border-otl-divider pt-3 text-body-sm text-txt-black-500">
      <p>
        {t('fuel.freshness.asOf', { date: formatDateTime(meta.data_as_of, i18n.language) })} ·{' '}
        {t('fuel.freshness.next', { date: formatDate(meta.next_update, i18n.language) })}
      </p>
      <p>{t('fuel.freshness.source', { source: meta.data_source.join(', ') })}</p>
      <a href={FUEL_DATASET_URL} className="font-medium text-txt-primary underline underline-offset-2">
        {t('fuel.freshness.link')}
      </a>
    </footer>
  );
}
```

If the `·` separator puts the two phrases into one text node so that `getByText(/Data as of 24 Sep/)` matches the whole paragraph, that is fine, because the test uses regular expressions.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/open-data/components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/features/open-data/components
git commit -m "Add the latest-weeks table, the chart data table and a freshness footer"
```

---

### Task 8: The fuel prices page, route and navigation

**Files:**
- Create: `src/features/open-data/routes/FuelPricesRoute.tsx`
- Modify: `src/app/router.ts`, `src/app/AppLayout.tsx`
- Test: `src/features/open-data/routes/FuelPricesRoute.test.tsx`, `src/app/router.test.tsx` (append)

**Interfaces:**
- `/open-data/fuel-prices` is a lazy route with a route-level `ErrorBoundary`, reached from a new header nav link ("Fuel prices").
- The page has, in order:
  - an `h1` and the intro
  - `FuelFilters`, in one row
  - the chart area:
    - **First load:** a 300px skeleton with a `role="status"` loading text.
    - **Error with no data:** the shared `LoadError`, titled `fuel.errorTitle`.
    - **Refetching:** the previous chart at `opacity-60`, with `aria-busy` on its wrapper.
    - **No fuels selected:** the `fuel.fuels.none` text instead of the chart.
  - a `fuel.skipped` note when `skipped > 0`
  - `LatestPricesTable`
  - `ChartDataTable`
  - `DataFreshness`

- [ ] **Step 1: Write the failing tests**

`src/features/open-data/routes/FuelPricesRoute.test.tsx`:

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import fixture from '@/mocks/fixtures/fuelprice.json';
import { setDevControls } from '@/mocks/devControls';
import { DATA_GOV_CATALOGUE_URL } from '@/mocks/handlers/dataGov';
import { server } from '@/mocks/node';
import { renderRoutes } from '@/test/render';
import { pinDate, unpinDate } from '@/test/time';
import { Component as FuelPricesRoute } from './FuelPricesRoute';

const renderPage = (url = '/open-data/fuel-prices') =>
  renderRoutes([{ path: '/open-data/fuel-prices', Component: FuelPricesRoute }], { initialEntries: [url] });

describe('/open-data/fuel-prices', () => {
  beforeEach(() => pinDate('2026-09-25T00:00:00.000Z'));
  afterEach(unpinDate);

  it('loads, then shows the chart, the latest weeks and the source', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Fuel prices' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading fuel prices…');

    expect(await screen.findByRole('group', { name: 'Weekly fuel prices, 6 months' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /latest weeks/i })).toBeInTheDocument();
    expect(screen.getByText('Source: MOF via data.gov.my')).toBeInTheDocument();
  });

  it('changes the range from the filter row and keeps it in the URL', async () => {
    const { user, router } = renderPage();
    await screen.findByRole('group', { name: 'Weekly fuel prices, 6 months' });

    await user.click(screen.getByRole('button', { name: '3 months' }));

    expect(await screen.findByRole('group', { name: 'Weekly fuel prices, 3 months' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?range=3m');
  });

  it('hides a fuel from the chart and every table', async () => {
    const { user } = renderPage();
    await screen.findByRole('group', { name: /Weekly fuel prices/ });

    await user.click(screen.getByRole('button', { name: 'RON97' }));

    const latest = screen.getByRole('table', { name: /latest weeks/i });
    await waitFor(() =>
      expect(within(latest).queryByRole('columnheader', { name: 'RON97' })).not.toBeInTheDocument(),
    );
  });

  it('asks for a fuel when none is selected', async () => {
    renderPage('/open-data/fuel-prices?fuels=');
    expect(await screen.findByText('Choose at least one fuel to show the chart.')).toBeInTheDocument();
  });

  it('explains a rate limit and lets the user retry', async () => {
    setDevControls({ dataGov: 'rate_limited' });
    const { user } = renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load fuel prices");
    expect(alert).toHaveTextContent('Too many requests right now');

    setDevControls({ dataGov: 'fixture' });
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('group', { name: /Weekly fuel prices/ })).toBeInTheDocument();
  });

  it('explains an offline network', async () => {
    setDevControls({ dataGov: 'offline' });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  });

  it('keeps working when the API sends rows it does not understand, and says so', async () => {
    server.use(
      http.get(DATA_GOV_CATALOGUE_URL, () =>
        HttpResponse.json({
          ...fixture,
          data: [...fixture.data, { ...fixture.data[0], series_type: 'change_monthly' }],
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText('1 row had an unexpected format and is not shown.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Weekly fuel prices/ })).toBeInTheDocument();
  });
});
```

Append to `src/app/router.test.tsx`:

```tsx
it('reaches the fuel prices page from the header', async () => {
  pinDate('2026-09-25T00:00:00.000Z');
  const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });

  await user.click(await screen.findByRole('link', { name: 'Fuel prices' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Fuel prices' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/open-data/fuel-prices');
  unpinDate();
});
```

(Add `import { pinDate, unpinDate } from '@/test/time';`.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/open-data/routes src/app/router.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/features/open-data/routes/FuelPricesRoute.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { LoadError } from '@/shared/ui/LoadError';
import { useFuelPrices } from '../api/queries';
import { ChartDataTable } from '../components/ChartDataTable';
import { DataFreshness } from '../components/DataFreshness';
import { FuelFilters } from '../components/FuelFilters';
import { FuelPriceChart } from '../components/FuelPriceChart';
import { LatestPricesTable } from '../components/LatestPricesTable';
import { useFuelFilters } from '../hooks/useFuelFilters';

export function Component() {
  const { t } = useTranslation();
  const { range, fuels, setRange, toggleFuel } = useFuelFilters();
  const { data, error, isPending, isFetching, refetch } = useFuelPrices(range);
  const isRefreshing = isFetching && !isPending;

  return (
    <section aria-labelledby="fuel-heading" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 id="fuel-heading" className="font-heading text-heading-xs font-semibold">
          {t('fuel.title')}
        </h1>
        <p className="text-body-sm text-txt-black-700">{t('fuel.intro')}</p>
      </header>

      <FuelFilters range={range} fuels={fuels} onRangeChange={setRange} onToggleFuel={toggleFuel} />

      {data === undefined ? (
        error ? (
          <LoadError title={t('fuel.errorTitle')} error={error} onRetry={() => void refetch()} />
        ) : (
          <div role="status" className="flex h-[300px] items-center justify-center rounded-md bg-bg-washed">
            <span className="text-body-sm text-txt-black-500">{t('fuel.chart.loading')}</span>
          </div>
        )
      ) : (
        <>
          {error && <LoadError title={t('fuel.errorTitle')} error={error} onRetry={() => void refetch()} />}
          {/* Refetch keeps the frame: the previous chart stays, dimmed, while the new range loads. */}
          <div aria-busy={isFetching} className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {fuels.length === 0 ? (
              <p className="rounded-md border border-otl-divider p-6 text-center text-body-sm text-txt-black-700">
                {t('fuel.fuels.none')}
              </p>
            ) : (
              <FuelPriceChart levels={data.levels} fuels={fuels} rangeLabel={t(`fuel.range.${range}`)} />
            )}
          </div>
          {data.skipped > 0 && (
            <p className="text-body-sm text-txt-black-500">{t('fuel.skipped', { count: data.skipped })}</p>
          )}
          {fuels.length > 0 && (
            <>
              <LatestPricesTable levels={data.levels} changes={data.changes} fuels={fuels} />
              <ChartDataTable levels={data.levels} fuels={fuels} />
            </>
          )}
          <DataFreshness meta={data.meta} />
        </>
      )}
    </section>
  );
}
```

`src/app/router.ts`: add a sibling of `applications` inside the root route's `children`:

```ts
        {
          path: 'open-data/fuel-prices',
          ErrorBoundary: RouteError,
          lazy: {
            Component: async () =>
              (await import('@/features/open-data/routes/FuelPricesRoute')).Component,
          },
        },
```

`src/app/AppLayout.tsx`: add a second `NavLink` next to Applications, with the same classes, to `/open-data/fuel-prices` and label `t('app.nav.fuel')`. The header must still fit at 360px (it uses `flex-wrap`).

- [ ] **Step 4: Run all tests and the full check**

Run: `npm run test:run`, then `npm run check`
Expected: PASS. The open-data route must be its own lazy chunk, with no chunk-size warning, and the test output must have no warnings.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src
git commit -m "Add the fuel prices page from data.gov.my with navigation"
```

---

### Task 9: Real API check, pull request and deploy

This task is done by the controller. **Pushing, merging and deploying need the user's approval.**

- [ ] **Step 1: Browser check** on the dev server, with the Dev Panel's data.gov.my switch on **Live API**:
  1. The header link opens `/open-data/fuel-prices`.
  2. The Network tab shows `GET https://api.data.gov.my/data-catalogue/?id=fuelprice&...` returning 200.
  3. The chart draws four lines with end labels. Hovering shows the crosshair and tooltip. Tabbing to the chart and using the arrow keys updates the readout.
  4. Range buttons and fuel toggles update the URL. The dimmed previous chart shows while reloading.
  5. The Latest weeks table shows up and down changes, and the data table expands.
  6. The freshness footer shows today's `data_as_of`.
  7. Switch the Dev Panel to Recorded, then 429, then 404, then Offline, and check each state.
  8. Dark mode uses the dark palette. At 360px the direct labels are hidden, the legend still shows, and nothing overflows.
  9. Malay: no English text is left.
  10. The console shows no warnings.
- [ ] **Step 2: Push the branch and open a PR** (ask first).
- [ ] **Step 3: After merging, redeploy and check the live site** (ask first).
