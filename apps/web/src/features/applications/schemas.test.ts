import { makeApplicationDetail, makeApplicationSummary } from './fixtures';
import {
  ApplicationDetailSchema,
  ApplicationListParamsSchema,
  ApplicationListSchema,
  DEFAULT_LIST_PARAMS,
  ReviewDecisionSchema,
  TimelineEventSchema,
} from './schemas';

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

  it('truncates an over-long search instead of discarding it', () => {
    const { q } = ApplicationListParamsSchema.parse({ q: `  ${'a'.repeat(150)}  ` });
    expect(q).toBe('a'.repeat(100));
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

describe('TimelineEventSchema', () => {
  it('accepts each event kind with its own fields', () => {
    const at = '2026-09-20T09:00:00.000Z';
    const events = [
      { id: 'e1', at, actor: 'Tan Wei Jie', kind: 'submitted' },
      {
        id: 'e2',
        at,
        actor: 'En. Kumar',
        kind: 'status_changed',
        from: 'submitted',
        to: 'under_review',
        note: null,
      },
      {
        id: 'e3',
        at,
        actor: 'En. Kumar',
        kind: 'info_requested',
        requestedInfo: ['floor_plan'],
        note: 'Sila hantar pelan.',
      },
      { id: 'e4', at, actor: 'En. Kumar', kind: 'comment', note: 'Lawatan tapak dijadualkan.' },
    ];
    for (const event of events) {
      expect(TimelineEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it('rejects an event missing the fields of its kind', () => {
    const result = TimelineEventSchema.safeParse({
      id: 'e2',
      at: '2026-09-20T09:00:00.000Z',
      actor: 'En. Kumar',
      kind: 'status_changed',
    });
    expect(result.success).toBe(false);
  });
});

describe('ApplicationDetailSchema', () => {
  it('accepts a full application record', () => {
    expect(ApplicationDetailSchema.safeParse(makeApplicationDetail()).success).toBe(true);
  });
});

describe('ReviewDecisionSchema', () => {
  const codes = (input: unknown) => {
    const result = ReviewDecisionSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('allows approval with an empty note', () => {
    expect(ReviewDecisionSchema.parse({ decision: 'approve', note: '  ' })).toEqual({
      decision: 'approve',
      note: '',
    });
  });

  it('requires a rejection reason of at least 10 characters after trimming', () => {
    expect(codes({ decision: 'reject', reason: '   short   ' })).toEqual(['reason_too_short']);
    expect(codes({ decision: 'reject', reason: 'Premis di zon kediaman' })).toEqual([]);
  });

  it('requires at least one document and a note when requesting information', () => {
    expect(codes({ decision: 'request_info', requestedInfo: [], note: 'ok' })).toEqual([
      'requested_info_required',
      'note_too_short',
    ]);
  });

  it('caps free text at 500 characters', () => {
    expect(codes({ decision: 'approve', note: 'a'.repeat(501) })).toEqual(['too_long']);
  });
});
