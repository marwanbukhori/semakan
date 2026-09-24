import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { FUEL_KEYS, FuelFiltersSchema } from '../schemas';
import type { FuelFilters, FuelKey, FuelRange } from '../types';

const DEFAULTS = FuelFiltersSchema.parse({});

// #region practice:url-state
function toSearchParams({ range, fuels }: FuelFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (range !== DEFAULTS.range) params.set('range', range);
  if (fuels.join(',') !== DEFAULTS.fuels.join(',')) params.set('fuels', fuels.join(','));
  return params;
}
// #endregion

const parse = (params: URLSearchParams) => FuelFiltersSchema.parse(Object.fromEntries(params));

/** Range and visible fuels live in the URL, so a chart view can be shared. */
export function useFuelFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [searchParams]);
  // React Router hands a functional update the params of the last render, not the last write, so
  // two changes in one tick would each start from the same URL and the first would be lost. Each
  // write therefore starts from the previous write until the new URL has rendered.
  const pending = useRef<FuelFilters | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [searchParams]);

  const update = useCallback(
    (change: (current: FuelFilters) => Partial<FuelFilters>) => {
      const current = pending.current ?? parse(searchParams);
      const next = { ...current, ...change(current) };
      pending.current = next;
      // replace: flipping filters should not fill the Back history.
      void setSearchParams(toSearchParams(next), { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setRange = useCallback((range: FuelRange) => update(() => ({ range })), [update]);
  const toggleFuel = useCallback(
    (key: FuelKey) =>
      update(({ fuels }) => ({
        fuels: FUEL_KEYS.filter((fuel) =>
          fuel === key ? !fuels.includes(fuel) : fuels.includes(fuel),
        ),
      })),
    [update],
  );

  return { ...filters, setRange, toggleFuel };
}
