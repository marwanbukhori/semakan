import { isReviewErrorCode, REVIEW_ERROR_CODES, type ReviewErrorCode } from '@semakan/contract';
import { assertNever } from '@/shared/lib/assertNever';
import type { ApplicationStatus, Decision } from './types';

export { isReviewErrorCode, REVIEW_ERROR_CODES, type ReviewErrorCode };

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

/** A server may send codes this client does not know yet; those fall back to a generic message. */
export function reviewErrorKey(code: string | undefined): `review.errors.${ReviewErrorCode}` {
  return code !== undefined && isReviewErrorCode(code)
    ? `review.errors.${code}`
    : 'review.errors.unknown';
}
