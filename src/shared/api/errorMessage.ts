import { assertNever } from '@/shared/lib/assertNever';
import { ApiError } from './ApiError';

/** Maps any data-layer error to the message key the user should see. */
export function apiErrorMessageKey(error: unknown) {
  if (!(error instanceof ApiError)) return 'errors.server' as const;
  switch (error.kind) {
    case 'network':
      return 'errors.network' as const;
    case 'schema':
      return 'errors.schema' as const;
    case 'http':
    case 'validation':
    case 'conflict':
      return 'errors.server' as const;
    default:
      return assertNever(error.kind);
  }
}
