import { isReviewErrorCode, REVIEW_ERROR_CODES, type ReviewErrorCode } from '@semakan/contract';
import { isReviewable, REVIEWABLE_STATUSES, statusAfterDecision } from '@semakan/domain';

export {
  isReviewErrorCode,
  isReviewable,
  REVIEW_ERROR_CODES,
  REVIEWABLE_STATUSES,
  statusAfterDecision,
  type ReviewErrorCode,
};

/** A server may send codes this client does not know yet; those fall back to a generic message. */
export function reviewErrorKey(code: string | undefined): `review.errors.${ReviewErrorCode}` {
  return code !== undefined && isReviewErrorCode(code)
    ? `review.errors.${code}`
    : 'review.errors.unknown';
}
