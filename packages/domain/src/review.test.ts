import type { ApplicationDetail } from '@semakan/contract';
import { decide, isReviewable, requiresFireCertificate, statusAfterDecision } from './review';

const NOW = new Date('2026-09-24T03:00:00.000Z');

function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-001',
    referenceNo: 'LPP-2026-1000',
    applicantName: 'Tan Wei Jie',
    businessName: 'Kedai Runcit Maju',
    premisesCategory: 'retail',
    state: 'Selangor',
    submittedAt: '2026-09-01T02:00:00.000Z',
    status: 'under_review',
    assignedOfficerName: 'Pn. Hafizah',
    applicantIdNumber: '900101-10-1234',
    applicantEmail: 'tan.1@example.com.my',
    applicantPhone: '012-345 6789',
    businessAddress: '1, Jalan Merdeka, 40000 Selangor',
    documents: [
      {
        id: 'app-001-doc-1',
        kind: 'ssm_certificate',
        fileName: 'ssm_certificate.pdf',
        sizeKb: 120,
      },
    ],
    timeline: [
      {
        id: 'app-001-ev-1',
        kind: 'submitted',
        at: '2026-09-01T02:00:00.000Z',
        actor: 'Tan Wei Jie',
      },
      {
        id: 'app-001-ev-2',
        kind: 'status_changed',
        at: '2026-09-02T02:00:00.000Z',
        actor: 'Pn. Hafizah',
        from: 'submitted',
        to: 'under_review',
        note: null,
      },
    ],
    version: 2,
    ...overrides,
  };
}

describe('decide', () => {
  it('approves: new status, bumped version, officer assigned, event appended', () => {
    const result = decide(
      makeDetail(),
      { version: 2, review: { decision: 'approve', note: '' } },
      'Pn. Hafizah',
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.detail.status).toBe('approved');
    expect(result.value.detail.version).toBe(3);
    expect(result.value.event).toEqual({
      id: 'app-001-ev-3',
      kind: 'status_changed',
      at: NOW.toISOString(),
      actor: 'Pn. Hafizah',
      from: 'under_review',
      to: 'approved',
      note: null,
    });
    expect(result.value.detail.timeline.at(-1)).toEqual(result.value.event);
  });

  it('rejects with the reason as the note, and request_info with its documents', () => {
    const rejected = decide(
      makeDetail(),
      { version: 2, review: { decision: 'reject', reason: 'Premis tidak sesuai' } },
      'x',
      NOW,
    );
    expect(rejected.ok && rejected.value.event).toMatchObject({
      kind: 'status_changed',
      to: 'rejected',
      note: 'Premis tidak sesuai',
    });
    const info = decide(
      makeDetail(),
      {
        version: 2,
        review: { decision: 'request_info', requestedInfo: ['floor_plan'], note: 'Sila hantar' },
      },
      'x',
      NOW,
    );
    expect(info.ok && info.value.event).toMatchObject({
      kind: 'info_requested',
      requestedInfo: ['floor_plan'],
      note: 'Sila hantar',
    });
    expect(info.ok && info.value.detail.status).toBe('info_requested');
  });

  it('reports a stale version before anything else', () => {
    const result = decide(
      makeDetail({ status: 'approved' }),
      { version: 1, review: { decision: 'approve', note: '' } },
      'x',
      NOW,
    );
    expect(result).toEqual({ ok: false, error: { kind: 'version_conflict' } });
  });

  it('refuses decided applications', () => {
    const result = decide(
      makeDetail({ status: 'approved' }),
      { version: 2, review: { decision: 'approve', note: '' } },
      'x',
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: 'rejected', field: 'decision', code: 'not_reviewable' },
    });
  });

  it('requires a fire certificate to approve food and entertainment premises', () => {
    const food = makeDetail({ premisesCategory: 'food_beverage' });
    expect(
      decide(food, { version: 2, review: { decision: 'approve', note: '' } }, 'x', NOW),
    ).toEqual({
      ok: false,
      error: { kind: 'rejected', field: 'decision', code: 'missing_fire_certificate' },
    });
    // Rejecting needs no certificate.
    expect(
      decide(
        food,
        { version: 2, review: { decision: 'reject', reason: 'Tidak lengkap sama sekali' } },
        'x',
        NOW,
      ).ok,
    ).toBe(true);
  });
});

it('keeps the shared rules', () => {
  expect(isReviewable('info_requested')).toBe(true);
  expect(isReviewable('rejected')).toBe(false);
  expect(statusAfterDecision('request_info')).toBe('info_requested');
  expect(requiresFireCertificate('entertainment')).toBe(true);
  expect(requiresFireCertificate('retail')).toBe(false);
});

// Not in the brief: these close the coverage gap left by the exhaustiveness-check branches
// (`assertNever`) that `decide` and `statusAfterDecision` inherit verbatim from the mock, and
// by the untested non-empty-note path of the approve branch. See the report's Concerns.
describe('exhaustiveness and the approve note', () => {
  it('keeps a non-empty approve note instead of nulling it', () => {
    const result = decide(
      makeDetail(),
      { version: 2, review: { decision: 'approve', note: 'Diluluskan' } },
      'x',
      NOW,
    );
    expect(result.ok && result.value.event).toMatchObject({ note: 'Diluluskan' });
  });

  it('statusAfterDecision throws on an unhandled decision', () => {
    expect(() => statusAfterDecision('bogus' as never)).toThrow('Unhandled value: "bogus"');
  });

  it('decide throws on an unhandled decision', () => {
    expect(() =>
      decide(makeDetail(), { version: 2, review: { decision: 'bogus' } as never }, 'x', NOW),
    ).toThrow('Unhandled value');
  });
});
