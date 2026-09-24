import { PAGE_SIZE } from '@semakan/contract';
import type {
  ApplicationList,
  ApplicationListParams,
  ApplicationSummary,
  SortField,
} from '@semakan/contract';

const SORTERS: Record<SortField, (a: ApplicationSummary, b: ApplicationSummary) => number> = {
  submittedAt: (a, b) => a.submittedAt.localeCompare(b.submittedAt),
  referenceNo: (a, b) => a.referenceNo.localeCompare(b.referenceNo),
  businessName: (a, b) => a.businessName.localeCompare(b.businessName),
};

/** Server-side filter, sort and paginate, the way a real list endpoint would. */
export function queryApplications(
  all: readonly ApplicationSummary[],
  params: ApplicationListParams,
  pageSize = PAGE_SIZE,
): ApplicationList {
  const q = params.q.toLowerCase();
  const matches = all.filter(
    (item) =>
      (params.status === 'all' || item.status === params.status) &&
      (q === '' ||
        [item.referenceNo, item.applicantName, item.businessName].some((field) =>
          field.toLowerCase().includes(q),
        )),
  );

  const direction = params.order === 'asc' ? 1 : -1;
  const sorted = [...matches].sort(
    (a, b) =>
      (SORTERS[params.sort](a, b) || a.referenceNo.localeCompare(b.referenceNo)) * direction,
  );

  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(params.page, lastPage);
  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: sorted.length,
  };
}
