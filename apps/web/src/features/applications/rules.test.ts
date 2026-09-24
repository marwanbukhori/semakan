import { isReviewable, isReviewErrorCode, reviewErrorKey, statusAfterDecision } from './rules';

describe('review rules', () => {
  it('allows review only while an application is open', () => {
    expect(isReviewable('submitted')).toBe(true);
    expect(isReviewable('under_review')).toBe(true);
    expect(isReviewable('info_requested')).toBe(true);
    expect(isReviewable('approved')).toBe(false);
    expect(isReviewable('rejected')).toBe(false);
  });

  it('maps each decision to the status it produces', () => {
    expect(statusAfterDecision('approve')).toBe('approved');
    expect(statusAfterDecision('reject')).toBe('rejected');
    expect(statusAfterDecision('request_info')).toBe('info_requested');
  });

  it('turns known error codes into translation keys and unknown ones into a fallback', () => {
    expect(isReviewErrorCode('missing_fire_certificate')).toBe(true);
    expect(isReviewErrorCode('something_else')).toBe(false);
    expect(reviewErrorKey('reason_too_short')).toBe('review.errors.reason_too_short');
    expect(reviewErrorKey('something_else')).toBe('review.errors.unknown');
    expect(reviewErrorKey(undefined)).toBe('review.errors.unknown');
  });
});
