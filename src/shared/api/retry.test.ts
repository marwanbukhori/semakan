import { ApiError } from './ApiError';
import { shouldRetryQuery } from './retry';

const error = (kind: ApiError['kind'], status?: number) =>
  new ApiError({ kind, status, message: 'x' });

describe('shouldRetryQuery', () => {
  it('retries network and 5xx errors up to two times', () => {
    expect(shouldRetryQuery(0, error('network'))).toBe(true);
    expect(shouldRetryQuery(1, error('http', 503))).toBe(true);
    expect(shouldRetryQuery(2, error('http', 503))).toBe(false);
  });

  it('never retries client errors, conflicts, validation or schema problems', () => {
    const noRetry = [
      error('http', 404),
      error('conflict', 409),
      error('validation', 422),
      error('schema', 200),
      new Error('boom'),
    ];
    for (const e of noRetry) {
      expect(shouldRetryQuery(0, e)).toBe(false);
    }
  });
});
