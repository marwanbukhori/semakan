import { useTranslation } from 'react-i18next';
import { LoadError } from '@/shared/ui/LoadError';
import { useFuelPrices } from '../api/queries';
import { ChartDataTable } from '../components/ChartDataTable';
import { DataFreshness } from '../components/DataFreshness';
import { FuelFilters } from '../components/FuelFilters';
import { FuelPriceChart } from '../components/FuelPriceChart';
import { LatestPricesTable } from '../components/LatestPricesTable';
import { useFuelFilters } from '../hooks/useFuelFilters';

export function Component() {
  const { t } = useTranslation();
  const { range, fuels, setRange, toggleFuel } = useFuelFilters();
  const { data, error, isPending, isFetching, refetch } = useFuelPrices(range);
  const isRefreshing = isFetching && !isPending;

  return (
    <section aria-labelledby="fuel-heading" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 id="fuel-heading" className="font-heading text-heading-xs font-semibold">
          {t('fuel.title')}
        </h1>
        <p className="text-body-sm text-txt-black-700">{t('fuel.intro')}</p>
      </header>

      <FuelFilters range={range} fuels={fuels} onRangeChange={setRange} onToggleFuel={toggleFuel} />

      {data === undefined ? (
        error ? (
          <LoadError title={t('fuel.errorTitle')} error={error} onRetry={() => void refetch()} />
        ) : (
          <div
            role="status"
            className="flex h-[300px] items-center justify-center rounded-md bg-bg-washed"
          >
            <span className="text-body-sm text-txt-black-500">{t('fuel.chart.loading')}</span>
          </div>
        )
      ) : (
        <>
          {error && (
            <LoadError title={t('fuel.errorTitle')} error={error} onRetry={() => void refetch()} />
          )}
          {/* Refetch keeps the frame: the previous chart stays, dimmed, while the new range loads. */}
          <div
            aria-busy={isFetching}
            className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}
          >
            {fuels.length === 0 ? (
              <p className="rounded-md border border-otl-divider p-6 text-center text-body-sm text-txt-black-700">
                {t('fuel.fuels.none')}
              </p>
            ) : (
              <FuelPriceChart
                levels={data.levels}
                fuels={fuels}
                rangeLabel={t(`fuel.range.${range}`)}
              />
            )}
          </div>
          {data.skipped > 0 && (
            <p className="text-body-sm text-txt-black-500">
              {t('fuel.skipped', { count: data.skipped })}
            </p>
          )}
          {fuels.length > 0 && (
            <>
              <LatestPricesTable levels={data.levels} changes={data.changes} fuels={fuels} />
              <ChartDataTable levels={data.levels} fuels={fuels} />
            </>
          )}
          <DataFreshness meta={data.meta} />
        </>
      )}
    </section>
  );
}
