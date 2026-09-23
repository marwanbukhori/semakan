import { ApiError } from './ApiError';

export const MAX_RETRIES = 2;

/** Retry only failures that might succeed on a second try: network drops and 5xx responses. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return false;
  return error.kind === 'network' || (error.kind === 'http' && (error.status ?? 0) >= 500);
}
