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

type SetFiltersOptions = {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
};

// #region practice:derive-dont-sync
/** The URL is the single source of truth for list filters: shareable, and back/forward just works. */
export function useApplicationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [searchParams]);
  const hasActiveFilters =
    filters.status !== DEFAULT_LIST_PARAMS.status || filters.q !== DEFAULT_LIST_PARAMS.q;

  const setFilters = useCallback(
    (patch: Partial<ApplicationListParams>, options: SetFiltersOptions = {}) => {
      // Search commits while typing would otherwise flood history with one entry per pause.
      const onlySearch = Object.keys(patch).every((key) => key === 'q');
      void setSearchParams(
        // Any change other than the page itself starts again from page 1. Parsing the merged
        // result normalises it (e.g. trims q) before it reaches the URL.
        (previous) =>
          toSearchParams(
            ApplicationListParamsSchema.parse({ ...parse(previous), page: 1, ...patch }),
          ),
        { replace: options.replace ?? onlySearch },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    void setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, hasActiveFilters, setFilters, resetFilters };
}
// #endregion
