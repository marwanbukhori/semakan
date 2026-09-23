import { makeApplicationSummary } from './fixtures';
import { ApplicationListParamsSchema, ApplicationListSchema, DEFAULT_LIST_PARAMS } from './schemas';

describe('ApplicationListParamsSchema', () => {
  it('fills defaults for an empty URL', () => {
    expect(ApplicationListParamsSchema.parse({})).toEqual({
      page: 1,
      status: 'all',
      q: '',
      sort: 'submittedAt',
      order: 'desc',
    });
  });

  it('coerces valid values from URL strings and trims the search', () => {
    expect(
      ApplicationListParamsSchema.parse({
        page: '3',
        status: 'approved',
        q: '  kedai ',
        sort: 'businessName',
        order: 'asc',
      }),
    ).toEqual({ page: 3, status: 'approved', q: 'kedai', sort: 'businessName', order: 'asc' });
  });

  it('falls back to defaults for tampered values instead of throwing', () => {
    expect(
      ApplicationListParamsSchema.parse({
        page: '-4',
        status: 'hacked',
        sort: 'password',
        order: 'sideways',
      }),
    ).toEqual(DEFAULT_LIST_PARAMS);
  });
});

describe('ApplicationListSchema', () => {
  it('accepts a valid page of results', () => {
    const page = { items: [makeApplicationSummary()], page: 1, pageSize: 10, total: 1 };
    expect(ApplicationListSchema.safeParse(page).success).toBe(true);
  });

  it('rejects an item with a status the UI does not know', () => {
    const page = {
      items: [{ ...makeApplicationSummary(), status: 'lost' }],
      page: 1,
      pageSize: 10,
      total: 1,
    };
    expect(ApplicationListSchema.safeParse(page).success).toBe(false);
  });

  it('rejects a submittedAt that is not an ISO timestamp', () => {
    const page = {
      items: [{ ...makeApplicationSummary(), submittedAt: '20/09/2026' }],
      page: 1,
      pageSize: 10,
      total: 1,
    };
    expect(ApplicationListSchema.safeParse(page).success).toBe(false);
  });
});
