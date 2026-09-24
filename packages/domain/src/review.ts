import type {
  ApplicationDetail,
  ApplicationStatus,
  Decision,
  PremisesCategory,
  ReviewRequest,
  TimelineEvent,
} from '@semakan/contract';
import { err, ok, type Result } from './result';

/** Compile-time exhaustiveness check: calling this with a non-`never` value is a type error. */
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

export const REVIEWABLE_STATUSES = ['submitted', 'under_review', 'info_requested'] as const;

export function isReviewable(status: ApplicationStatus): boolean {
  return (REVIEWABLE_STATUSES as readonly ApplicationStatus[]).includes(status);
}

export function statusAfterDecision(decision: Decision): ApplicationStatus {
  switch (decision) {
    case 'approve':
      return 'approved';
    case 'reject':
      return 'rejected';
    case 'request_info':
      return 'info_requested';
    default:
      return assertNever(decision);
  }
}

export function requiresFireCertificate(category: PremisesCategory): boolean {
  return category === 'food_beverage' || category === 'entertainment';
}

export type ReviewError =
  | { kind: 'version_conflict' }
  | { kind: 'rejected'; field: 'decision'; code: 'not_reviewable' | 'missing_fire_certificate' };

export function decide(
  app: ApplicationDetail,
  request: ReviewRequest,
  actor: string,
  now: Date,
): Result<{ detail: ApplicationDetail; event: TimelineEvent }, ReviewError> {
  if (request.version !== app.version) return err({ kind: 'version_conflict' });
  if (!isReviewable(app.status))
    return err({ kind: 'rejected', field: 'decision', code: 'not_reviewable' });

  const { review } = request;
  if (
    review.decision === 'approve' &&
    requiresFireCertificate(app.premisesCategory) &&
    !app.documents.some((doc) => doc.kind === 'fire_certificate')
  ) {
    return err({ kind: 'rejected', field: 'decision', code: 'missing_fire_certificate' });
  }

  const to = statusAfterDecision(review.decision);
  const base = {
    id: `${app.id}-ev-${app.timeline.length + 1}`,
    at: now.toISOString(),
    actor,
  };
  let event: TimelineEvent;
  switch (review.decision) {
    case 'approve':
      event = {
        ...base,
        kind: 'status_changed',
        from: app.status,
        to,
        note: review.note === '' ? null : review.note,
      };
      break;
    case 'reject':
      event = { ...base, kind: 'status_changed', from: app.status, to, note: review.reason };
      break;
    case 'request_info':
      event = {
        ...base,
        kind: 'info_requested',
        requestedInfo: review.requestedInfo,
        note: review.note,
      };
      break;
    default:
      return assertNever(review);
  }

  const detail: ApplicationDetail = {
    ...app,
    status: to,
    assignedOfficerName: actor,
    timeline: [...app.timeline, event],
    version: app.version + 1,
  };

  return ok({ detail, event });
}
