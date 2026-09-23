import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { FUEL_KEYS, FuelFiltersSchema } from '../schemas';
import type { FuelFilters, FuelKey, FuelRange } from '../types';

const DEFAULTS = FuelFiltersSchema.parse({});

function toSearchParams({ range, fuels }: FuelFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (range !== DEFAULTS.range) params.set('range', range);
  if (fuels.join(',') !== DEFAULTS.fuels.join(',')) params.set('fuels', fuels.join(','));
  return params;
}

const parse = (params: URLSearchParams) => FuelFiltersSchema.parse(Object.fromEntries(params));

/** Range and visible fuels live in the URL, so a chart view can be shared. */
export function useFuelFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<FuelFilters>) => {
      // replace: flipping filters should not fill the Back history.
      void setSearchParams((previous) => toSearchParams({ ...parse(previous), ...patch }), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const setRange = useCallback((range: FuelRange) => update({ range }), [update]);
  const toggleFuel = useCallback(
    (key: FuelKey) =>
      update({
        fuels: FUEL_KEYS.filter((fuel) =>
          fuel === key ? !filters.fuels.includes(fuel) : filters.fuels.includes(fuel),
        ),
      }),
    [filters.fuels, update],
  );

  return { ...filters, setRange, toggleFuel };
}
