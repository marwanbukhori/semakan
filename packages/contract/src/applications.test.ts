import {
  ApplicationDetailSchema,
  ApplicationListParamsSchema,
  ApplicationListSchema,
  ApplicationSummarySchema,
  DEFAULT_LIST_PARAMS,
  ReviewDecisionSchema,
  ReviewRequestSchema,
  TimelineEventSchema,
} from './applications';

const summary = {
  id: 'app-001',
  referenceNo: 'LPP-2026-1000',
  applicantName: 'Tan Wei Jie',
  businessName: 'Kedai Runcit Maju',
  premisesCategory: 'retail',
  state: 'Selangor',
  submittedAt: '2026-09-20T09:00:00.000Z',
  status: 'approved',
  assignedOfficerName: 'Pn. Hafizah',
};

describe('ApplicationSummarySchema', () => {
  it('accepts a valid summary', () => {
    expect(ApplicationSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('rejects an unknown premises category', () => {
    expect(
      ApplicationSummarySchema.safeParse({ ...summary, premisesCategory: 'unknown' }).success,
    ).toBe(false);
  });
});

describe('ApplicationListSchema', () => {
  it('accepts a page of results', () => {
    const page = { items: [summary], page: 1, pageSize: 10, total: 1 };
    expect(ApplicationListSchema.safeParse(page).success).toBe(true);
  });
});

describe('ApplicationListParamsSchema', () => {
  it('defaults every field for an empty URL', () => {
    expect(DEFAULT_LIST_PARAMS).toEqual(
      ApplicationListParamsSchema.parse({
        page: undefined,
        status: undefined,
        q: undefined,
        sort: undefined,
        order: undefined,
      }),
    );
  });

  it('truncates an over-long search to 100 characters', () => {
    const { q } = ApplicationListParamsSchema.parse({ q: `  ${'a'.repeat(150)}  ` });
    expect(q).toBe('a'.repeat(100));
  });

  it('falls back to defaults for tampered values instead of throwing', () => {
    expect(
      ApplicationListParamsSchema.parse({ page: '-4', status: 'hacked', sort: 'password' }),
    ).toEqual(DEFAULT_LIST_PARAMS);
  });
});

describe('TimelineEventSchema', () => {
  it('accepts each event kind with its own fields', () => {
    const at = '2026-09-20T09:00:00.000Z';
    for (const event of [
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
    ]) {
      expect(TimelineEventSchema.safeParse(event).success).toBe(true);
    }
  });
});

describe('ApplicationDetailSchema', () => {
  it('accepts a full application record', () => {
    expect(
      ApplicationDetailSchema.safeParse({
        ...summary,
        applicantIdNumber: '850412-10-5523',
        applicantEmail: 'tan.1@example.com.my',
        applicantPhone: '012-345 6789',
        businessAddress: '12, Jalan Merdeka, 40000 Selangor',
        documents: [],
        timeline: [],
        version: 1,
      }).success,
    ).toBe(true);
  });
});

describe('ReviewDecisionSchema and ReviewRequestSchema', () => {
  it('trims and validates each decision kind', () => {
    expect(ReviewDecisionSchema.parse({ decision: 'approve', note: '  ' })).toEqual({
      decision: 'approve',
      note: '',
    });
    expect(ReviewDecisionSchema.safeParse({ decision: 'reject', reason: 'short' }).success).toBe(
      false,
    );
    expect(
      ReviewDecisionSchema.safeParse({
        decision: 'request_info',
        requestedInfo: ['floor_plan'],
        note: 'Sila hantar pelan lantai.',
      }).success,
    ).toBe(true);
  });

  it('wraps a decision with the version it was based on', () => {
    expect(
      ReviewRequestSchema.safeParse({ version: 1, review: { decision: 'approve', note: '' } })
        .success,
    ).toBe(true);
  });
});
