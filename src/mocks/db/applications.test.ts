import { z } from 'zod';
import {
  ApplicationDetailSchema,
  ApplicationSummarySchema,
  DEFAULT_LIST_PARAMS,
} from '@/features/applications/schemas';
import { isReviewable } from '@/features/applications/rules';
import {
  applyReview,
  getApplication,
  queryApplications,
  requiresFireCertificate,
  seedApplicationDetails,
  seedApplications,
  toSummary,
} from './applications';

const items = seedApplications();

describe('seedApplications', () => {
  it('is deterministic, so the demo looks the same on every load', () => {
    expect(seedApplications(5)).toEqual(seedApplications(5));
    expect(items).toHaveLength(57);
  });

  it('only produces records that satisfy the API contract', () => {
    expect(z.array(ApplicationSummarySchema).safeParse(items).success).toBe(true);
  });

  // The About > Overview tour links straight to /applications/app-001/review (a review
  // dialog demo), so app-001 must stay reviewable for that link to work.
  it('keeps app-001 reviewable, since the About tour links directly to its review dialog', () => {
    const first = items.find((item) => item.id === 'app-001')!;
    expect(isReviewable(first.status)).toBe(true);
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

const details = seedApplicationDetails();
const hasFire = (d: (typeof details)[number]) =>
  d.documents.some((doc) => doc.kind === 'fire_certificate');

describe('seedApplicationDetails', () => {
  it('extends the Plan 1 summaries without changing them', () => {
    expect(details.map(toSummary)).toEqual(seedApplications());
  });

  it('produces records that satisfy the detail contract', () => {
    expect(z.array(ApplicationDetailSchema).safeParse(details).success).toBe(true);
  });

  it('gives every record a timeline that starts with its submission and a matching version', () => {
    for (const d of details) {
      expect(d.timeline[0]?.kind).toBe('submitted');
      expect(d.version).toBe(d.timeline.length);
    }
  });

  it('never approves a premises that needs a fire certificate without one', () => {
    const inconsistent = details.filter(
      (d) => d.status === 'approved' && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    );
    expect(inconsistent).toEqual([]);
  });

  it('contains an open application that the fire-certificate rule will block', () => {
    const blocked = details.find(
      (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    );
    expect(blocked).toBeDefined();
  });
});

describe('applyReview', () => {
  const open = () =>
    details.find((d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory))!;
  const now = new Date('2026-09-23T02:00:00.000Z');

  it('records a decision, appends a timeline event and bumps the version', () => {
    const target = open();
    const outcome = applyReview(
      target.id,
      { version: target.version, review: { decision: 'reject', reason: 'Premis di zon kediaman' } },
      now,
    );

    expect(outcome.kind).toBe('ok');
    const saved = getApplication(target.id)!;
    expect(saved.status).toBe('rejected');
    expect(saved.version).toBe(target.version + 1);
    expect(saved.assignedOfficerName).toBe('Pn. Hafizah');
    expect(saved.timeline.at(-1)).toMatchObject({
      kind: 'status_changed',
      from: target.status,
      to: 'rejected',
      note: 'Premis di zon kediaman',
      actor: 'Pn. Hafizah',
      at: now.toISOString(),
    });
  });

  it('records an information request with the requested documents', () => {
    const target = open();
    applyReview(
      target.id,
      {
        version: target.version,
        review: {
          decision: 'request_info',
          requestedInfo: ['floor_plan'],
          note: 'Sila hantar pelan lantai.',
        },
      },
      now,
    );
    expect(getApplication(target.id)?.timeline.at(-1)).toMatchObject({
      kind: 'info_requested',
      requestedInfo: ['floor_plan'],
    });
  });

  it('rejects a stale version as a conflict', () => {
    const target = open();
    const outcome = applyReview(target.id, {
      version: target.version - 1,
      review: { decision: 'approve', note: '' },
    });
    expect(outcome).toEqual({ kind: 'conflict' });
  });

  it('refuses to approve without a required fire certificate', () => {
    const target = details.find(
      (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    )!;
    const outcome = applyReview(target.id, {
      version: target.version,
      review: { decision: 'approve', note: '' },
    });
    expect(outcome).toEqual({
      kind: 'invalid',
      fieldErrors: { decision: ['missing_fire_certificate'] },
    });
  });

  it('refuses to review an application that already has a decision', () => {
    const closed = details.find((d) => d.status === 'approved')!;
    const outcome = applyReview(closed.id, {
      version: closed.version,
      review: { decision: 'reject', reason: 'Tidak lagi sah.' },
    });
    expect(outcome).toEqual({ kind: 'invalid', fieldErrors: { decision: ['not_reviewable'] } });
  });

  it('reports an unknown application', () => {
    expect(
      applyReview('app-999', { version: 1, review: { decision: 'approve', note: '' } }),
    ).toEqual({ kind: 'not_found' });
  });
});
