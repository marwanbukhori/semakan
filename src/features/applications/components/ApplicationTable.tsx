import { ChevronDownIcon, ChevronUpIcon } from '@govtechmy/myds-react/icon';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@govtechmy/myds-react/table';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDate } from '@/shared/lib/format';
import type { ApplicationSummary, SortField, SortOrder } from '../types';
import { StatusBadge } from './StatusBadge';

const COLUMN_COUNT = 6;
const SKELETON_ROWS = 5;

type OnSortChange = (sort: SortField, order: SortOrder) => void;

type ApplicationTableProps = {
  items: readonly ApplicationSummary[] | undefined;
  isLoading: boolean;
  sort: SortField;
  order: SortOrder;
  onSortChange: OnSortChange;
  emptyState: ReactNode;
};

/**
 * Built from MYDS table primitives rather than MYDS DataTable, because DataTable
 * only sorts client-side and our API sorts and paginates on the server.
 */
export function ApplicationTable({
  items,
  isLoading,
  sort,
  order,
  onSortChange,
  emptyState,
}: ApplicationTableProps) {
  const { t } = useTranslation();
  const sortable = (field: SortField) => (
    <SortableHead field={field} activeSort={sort} order={order} onSortChange={onSortChange} />
  );

  return (
    <Table aria-busy={isLoading}>
      <TableCaption className="sr-only">
        {isLoading ? t('applications.loading') : t('applications.title')}
      </TableCaption>
      <TableHeader>
        <TableRow>
          {sortable('referenceNo')}
          {sortable('businessName')}
          <TableHead>{t('applications.columns.applicantName')}</TableHead>
          <TableHead>{t('applications.columns.premisesCategory')}</TableHead>
          {sortable('submittedAt')}
          <TableHead>{t('applications.columns.status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <Rows items={items} isLoading={isLoading} emptyState={emptyState} />
      </TableBody>
    </Table>
  );
}

function Rows({
  items,
  isLoading,
  emptyState,
}: Pick<ApplicationTableProps, 'items' | 'isLoading' | 'emptyState'>) {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <>
        {Array.from({ length: SKELETON_ROWS }, (_, row) => (
          <TableRow key={row} aria-hidden="true">
            {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
              <TableCell key={cell}>
                <TableSkeleton />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  if (!items || items.length === 0) {
    return (
      <TableRow>
        <TableEmpty colSpan={COLUMN_COUNT}>{emptyState}</TableEmpty>
      </TableRow>
    );
  }

  return (
    <>
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell>
            <Link
              to={`/applications/${item.id}`}
              className="font-medium text-txt-primary underline-offset-2 hover:underline"
            >
              {item.referenceNo}
            </Link>
          </TableCell>
          <TableCell>{item.businessName}</TableCell>
          <TableCell>{item.applicantName}</TableCell>
          <TableCell>{t(`category.${item.premisesCategory}`)}</TableCell>
          <TableCell>{formatDate(item.submittedAt, i18n.language)}</TableCell>
          <TableCell>
            <StatusBadge status={item.status} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SortableHead({
  field,
  activeSort,
  order,
  onSortChange,
}: {
  field: SortField;
  activeSort: SortField;
  order: SortOrder;
  onSortChange: OnSortChange;
}) {
  const { t } = useTranslation();
  const isActive = field === activeSort;
  const ariaSort = isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none';
  const nextOrder: SortOrder = isActive && order === 'asc' ? 'desc' : 'asc';
  const Icon = order === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <TableHead aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSortChange(field, nextOrder)}
        className="inline-flex items-center gap-1 rounded-sm font-medium focus-visible:outline-none focus-visible:ring focus-visible:ring-fr-primary"
      >
        {t(`applications.columns.${field}`)}
        {isActive && <Icon aria-hidden="true" className="size-4" />}
      </button>
    </TableHead>
  );
}
