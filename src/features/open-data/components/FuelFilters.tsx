import { Button } from '@govtechmy/myds-react/button';
import { useTranslation } from 'react-i18next';
import { FUEL_KEYS, FUEL_RANGES } from '../schemas';
import type { FuelKey, FuelRange } from '../types';

type FuelFiltersProps = {
  range: FuelRange;
  fuels: readonly FuelKey[];
  onRangeChange: (range: FuelRange) => void;
  onToggleFuel: (fuel: FuelKey) => void;
};

/** One row above the chart. The fuel toggles double as the legend. */
export function FuelFilters({ range, fuels, onRangeChange, onToggleFuel }: FuelFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div role="group" aria-label={t('fuel.range.label')} className="flex flex-wrap gap-2">
        {FUEL_RANGES.map((option) => (
          <Button
            key={option}
            size="small"
            variant={option === range ? 'primary-fill' : 'default-outline'}
            aria-pressed={option === range}
            onClick={() => onRangeChange(option)}
          >
            {t(`fuel.range.${option}`)}
          </Button>
        ))}
      </div>
      <div role="group" aria-label={t('fuel.fuels.label')} className="flex flex-wrap gap-2">
        {FUEL_KEYS.map((fuel) => {
          const shown = fuels.includes(fuel);
          return (
            <Button
              key={fuel}
              size="small"
              variant={shown ? 'default-outline' : 'default-ghost'}
              aria-pressed={shown}
              onClick={() => onToggleFuel(fuel)}
              className={shown ? undefined : 'opacity-60'}
            >
              <span
                aria-hidden="true"
                className="fuel-chart inline-block h-0.5 w-3 rounded-full"
                style={{ backgroundColor: `var(--fuel-${fuel})` }}
              />
              {t(`fuel.series.${fuel}`)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
