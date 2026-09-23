import { useTranslation } from 'react-i18next';
import { useApplications } from '../api/queries';
import { ApplicationFilters } from '../components/ApplicationFilters';
import { ApplicationTable } from '../components/ApplicationTable';
import { ListPagination } from '../components/ListPagination';
import { EmptyResults, LoadError } from '../components/ListStates';
import { useApplicationFilters } from '../hooks/useApplicationFilters';
import { DEFAULT_LIST_PARAMS } from '../schemas';

/** Thin route: reads filters from the URL, fetches, and composes components. */
export function Component() {
  const { t } = useTranslation();
  const { filters, setFilters, resetFilters } = useApplicationFilters();
  const { data, error, isPending, isError, isFetching, refetch } = useApplications(filters);
  const hasActiveFilters =
    filters.status !== DEFAULT_LIST_PARAMS.status || filters.q !== DEFAULT_LIST_PARAMS.q;
  const isRefreshing = isFetching && !isPending;

  return (
    <section aria-labelledby="applications-heading" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="applications-heading" className="font-heading text-heading-xs font-semibold">
          {t('applications.title')}
        </h1>
        <p role="status" className="text-body-sm text-txt-black-500">
          {data && !isError ? t('applications.resultCount', { count: data.total }) : ''}
        </p>
      </header>

      <ApplicationFilters q={filters.q} status={filters.status} onChange={setFilters} />

      {isError ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : (
        <div
          aria-busy={isFetching}
          className={isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        >
          <ApplicationTable
            items={data?.items}
            isLoading={isPending}
            sort={filters.sort}
            order={filters.order}
            onSortChange={(sort, order) => setFilters({ sort, order })}
            emptyState={<EmptyResults hasActiveFilters={hasActiveFilters} onClear={resetFilters} />}
          />
        </div>
      )}

      {data && !isError && data.total > data.pageSize && (
        // MYDS's pagination list never wraps, so on narrow viewports it can be wider than the
        // page; contain that overflow to this element instead of letting it scroll the page.
        <div className="w-full overflow-x-auto">
          <ListPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}
    </section>
  );
}
