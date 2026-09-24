import { DEFAULT_LIST_PARAMS } from '@semakan/contract';
import { seedApplications } from './applications';
import { queryApplications } from './query';

const items = seedApplications();

describe('queryApplications', () => {
  it('filters by status, returning only that status', () => {
    const result = queryApplications(items, { ...DEFAULT_LIST_PARAMS, status: 'approved' });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.status === 'approved')).toBe(true);
  });

  it('matches the reference number, the applicant or the business, ignoring case', () => {
    const target = items[0]!;
    const byReference = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      q: target.referenceNo.toLowerCase(),
    });
    const byApplicant = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      q: target.applicantName.toUpperCase(),
    });
    const byBusiness = queryApplications(items, {
      ...DEFAULT_LIST_PARAMS,
      q: target.businessName.toUpperCase(),
    });
    expect(byReference.items.map((item) => item.id)).toEqual([target.id]);
    expect(byApplicant.items.map((item) => item.id)).toContain(target.id);
    expect(byBusiness.items.map((item) => item.id)).toContain(target.id);
  });

  it('sorts stably, breaking ties by referenceNo', () => {
    const result = queryApplications(
      items,
      { ...DEFAULT_LIST_PARAMS, sort: 'businessName', order: 'asc' },
      items.length,
    );
    // 57 records share only 20 business names, so some name repeats (pigeonhole); within
    // that group, order must fall back to referenceNo, ascending.
    const byBusiness = new Map<string, string[]>();
    for (const item of result.items) {
      byBusiness.set(item.businessName, [
        ...(byBusiness.get(item.businessName) ?? []),
        item.referenceNo,
      ]);
    }
    const tiedGroups = [...byBusiness.values()].filter((refs) => refs.length > 1);
    expect(tiedGroups.length).toBeGreaterThan(0);
    for (const refs of tiedGroups) {
      expect(refs).toEqual([...refs].sort());
    }
  });

  it('sorts by referenceNo directly, in both directions', () => {
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

  it('clamps a page above the last page to the last page', () => {
    const result = queryApplications(items, { ...DEFAULT_LIST_PARAMS, page: 9999 });
    const lastPage = Math.ceil(items.length / result.pageSize);
    expect(result.page).toBe(lastPage);
    expect(result.items.length).toBeGreaterThan(0);
  });
});
