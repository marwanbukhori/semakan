import { ApiError } from './ApiError';

/** Maps any data-layer error to the message key the user should see. */
export function apiErrorMessageKey(error: unknown) {
  if (error instanceof ApiError && error.kind === 'network') return 'errors.network' as const;
  if (error instanceof ApiError && error.kind === 'schema') return 'errors.schema' as const;
  return 'errors.server' as const;
}
