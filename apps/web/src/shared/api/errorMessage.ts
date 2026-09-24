import { assertNever } from '@/shared/lib/assertNever';
import { ApiError } from './ApiError';

// #region practice:async-states
/** Maps any data-layer error to the message key the user should see. */
export function apiErrorMessageKey(error: unknown) {
  if (!(error instanceof ApiError)) return 'errors.server' as const;
  switch (error.kind) {
    case 'network':
      return 'errors.network' as const;
    case 'schema':
      return 'errors.schema' as const;
    case 'http':
      if (error.status === 429) return 'errors.rateLimited' as const;
      if (error.status === 404) return 'errors.notFound' as const;
      return 'errors.server' as const;
    case 'validation':
    case 'conflict':
      return 'errors.server' as const;
    default:
      return assertNever(error.kind);
  }
}
// #endregion
