import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ApplicationListParamsSchema, DEFAULT_LIST_PARAMS } from '../schemas';
import type { ApplicationListParams } from '../types';

function parse(searchParams: URLSearchParams): ApplicationListParams {
  return ApplicationListParamsSchema.parse(Object.fromEntries(searchParams));
}

/** Only non-default values go in the URL, so shared links stay short. */
function toSearchParams(params: ApplicationListParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const key of Object.keys(params) as (keyof ApplicationListParams)[]) {
    if (params[key] !== DEFAULT_LIST_PARAMS[key]) result.set(key, String(params[key]));
  }
  return result;
}

/** The URL is the single source of truth for list filters: shareable, and back/forward just works. */
export function useApplicationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ApplicationListParams>) => {
      // Any change other than the page itself starts again from page 1.
      void setSearchParams((previous) => toSearchParams({ ...parse(previous), page: 1, ...patch }));
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    void setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, setFilters, resetFilters };
}
