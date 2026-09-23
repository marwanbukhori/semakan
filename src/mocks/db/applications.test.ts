import { z } from 'zod';
import { ApplicationSummarySchema, DEFAULT_LIST_PARAMS } from '@/features/applications/schemas';
import { queryApplications, seedApplications } from './applications';

const items = seedApplications();

describe('seedApplications', () => {
  it('is deterministic, so the demo looks the same on every load', () => {
    expect(seedApplications(5)).toEqual(seedApplications(5));
    expect(items).toHaveLength(57);
  });

  it('only produces records that satisfy the API contract', () => {
    expect(z.array(ApplicationSummarySchema).safeParse(items).success).toBe(true);
  });
});

describe('queryApplications', () => {
  it('filters by status', () => {
    const result = queryApplications(items, { ...DEFAULT_LIST_PARAMS, status: 'approved' });
    const expected = items.filter((item) => item.status === 'approved');
    expect(result.total).toBe(expected.length);
    expect(result.items.every((item) => item.status === 'approved')).toBe(true);
  });

  it('searches reference, applicant and business name, ignoring case', () => {
    const target = items[0]!;
    const byBusiness = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      q: target.businessName.toUpperCase(),
    });
    const byReference = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      q: target.referenceNo.toLowerCase(),
    });
    expect(byBusiness.items.map((item) => item.id)).toContain(target.id);
    expect(byReference.items.map((item) => item.id)).toEqual([target.id]);
  });

  it('sorts by the requested field and direction', () => {
    const asc = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      sort: 'referenceNo',
      order: 'asc',
    });
    const desc = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      sort: 'referenceNo',
      order: 'desc',
    });
    expect(asc.items[0]?.referenceNo).toBe('LPP-2026-1000');
    expect(desc.items[0]?.referenceNo).toBe('LPP-2026-1056');
  });

  it('paginates and clamps an out-of-range page to the last page', () => {
    const result = queryApplications(items, { ...DEFAULT_LIST_PARAMS, page: 99 });
    expect(result).toMatchObject({ page: 6, pageSize: 10, total: 57 });
    expect(result.items).toHaveLength(7);
  });

  it('returns page 1 with no items when nothing matches', () => {
    const result = queryApplications(items, { ...DEFAULT_LIST_PARAMS, q: 'zzzz-no-match' });
    expect(result).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });
});
