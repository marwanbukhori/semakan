import { isReviewErrorCode, REVIEW_ERROR_CODES } from './errors';

describe('review error codes', () => {
  it('recognises every published code and nothing else', () => {
    for (const code of REVIEW_ERROR_CODES) expect(isReviewErrorCode(code)).toBe(true);
    expect(isReviewErrorCode('made_up')).toBe(false);
  });

  it('includes the codes the server sends', () => {
    expect(REVIEW_ERROR_CODES).toEqual(
      expect.arrayContaining(['missing_fire_certificate', 'not_reviewable', 'unknown']),
    );
  });
});
