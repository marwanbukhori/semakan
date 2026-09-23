import { ApiError, type ApiErrorKind } from './ApiError';
import { apiErrorMessageKey } from './errorMessage';

const apiError = (kind: ApiErrorKind) => new ApiError({ kind, message: 'x' });

describe('apiErrorMessageKey', () => {
  it.each([
    ['network', 'errors.network'],
    ['schema', 'errors.schema'],
    ['http', 'errors.server'],
    ['validation', 'errors.server'],
    ['conflict', 'errors.server'],
  ] as const)('maps an ApiError of kind "%s" to %s', (kind, key) => {
    expect(apiErrorMessageKey(apiError(kind))).toBe(key);
  });

  it('treats anything that is not an ApiError as a server problem', () => {
    expect(apiErrorMessageKey(new TypeError('boom'))).toBe('errors.server');
  });
});
