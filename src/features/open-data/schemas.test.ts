import fixture from '@/mocks/fixtures/fuelprice.json';
import {
  CatalogueMetaSchema,
  FuelFiltersSchema,
  FuelPriceResponseSchema,
  FuelPriceRowSchema,
} from './schemas';

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

  it.each(['2026-13-01 00:00', '2026-02-30 00:00', '2026-09-24 24:00'])(
    'rejects the impossible timestamp %s as a parse issue instead of throwing',
    (value) => {
      const result = CatalogueMetaSchema.safeParse({ ...fixture.meta, data_as_of: value });
      expect(result.success).toBe(false);
    },
  );

  it('accepts a leap day and converts it to UTC', () => {
    const result = CatalogueMetaSchema.parse({ ...fixture.meta, last_updated: '2028-02-29 07:30' });
    expect(result.last_updated).toBe('2028-02-28T23:30:00.000Z');
  });

  it('skips and counts rows it does not understand instead of failing the page', () => {
    const result = FuelPriceResponseSchema.parse({
      ...fixture,
      data: [
        ...fixture.data,
        { ...fixture.data[0], series_type: 'change_monthly' },
        { date: 'bad' },
      ],
    });
    expect(result.skipped).toBe(2);
  });
});

describe('FuelPriceRowSchema', () => {
  const base = {
    date: '2026-09-24',
    ron95: 4.57,
    ron97: 5.05,
    diesel: 5.42,
    diesel_eastmsia: 2.15,
  };

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

  it('reads fuels from a comma list and keeps palette order, falls back for tampered values', () => {
    expect(FuelFiltersSchema.parse({ range: '1y', fuels: 'diesel,ron95' })).toEqual({
      range: '1y',
      fuels: ['ron95', 'diesel'],
    });
    expect(FuelFiltersSchema.parse({ range: '10y', fuels: 'petrol' })).toEqual(
      FuelFiltersSchema.parse({}),
    );
  });

  it('allows an explicitly empty selection', () => {
    expect(FuelFiltersSchema.parse({ fuels: '' }).fuels).toEqual([]);
  });
});
