import { assertNever } from '@/shared/lib/assertNever';
import type { ApplicationStatus, Decision } from './types';

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

/** Codes shared by client-side validation and the server's 422 responses. */
export const REVIEW_ERROR_CODES = [
  'reason_too_short',
  'note_too_short',
  'requested_info_required',
  'too_long',
  'missing_fire_certificate',
  'not_reviewable',
  'unknown',
] as const;

export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number];

export function isReviewErrorCode(value: string): value is ReviewErrorCode {
  return (REVIEW_ERROR_CODES as readonly string[]).includes(value);
}

/** A server may send codes this client does not know yet; those fall back to a generic message. */
export function reviewErrorKey(code: string | undefined): `review.errors.${ReviewErrorCode}` {
  return code !== undefined && isReviewErrorCode(code)
    ? `review.errors.${code}`
    : 'review.errors.unknown';
}
