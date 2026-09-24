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
