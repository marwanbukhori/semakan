import { Button, ButtonIcon } from '@govtechmy/myds-react/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@govtechmy/myds-react/icon';
import {
  AutoPagination,
  PaginationNext,
  PaginationPrevious,
} from '@govtechmy/myds-react/pagination';
import { useTranslation } from 'react-i18next';

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/**
 * MYDS AutoPagination with translated labels.
 *
 * PaginationPrevious/PaginationNext hardcode an English `aria-label` after spreading their
 * props, so it cannot be overridden; with `asChild` they render our own button instead, whose
 * translated text is its accessible name.
 *
 * Known MYDS limitation: each page-number button is named `page N` in English
 * (PaginationNumber sets `aria-label` after its props, and AutoPagination offers no hook).
 */
export function ListPagination({ page, pageSize, total, onPageChange }: ListPaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <AutoPagination
      type="default"
      page={page}
      limit={pageSize}
      count={total}
      maxDisplay={4}
      onPageChange={onPageChange}
      aria-label={t('applications.pagination.label')}
      previous={
        <PaginationPrevious asChild>
          <Button
            variant="default-outline"
            size="medium"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ButtonIcon>
              <ChevronLeftIcon />
            </ButtonIcon>
            {t('applications.pagination.previous')}
          </Button>
        </PaginationPrevious>
      }
      next={
        <PaginationNext asChild>
          <Button
            variant="default-outline"
            size="medium"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('applications.pagination.next')}
            <ButtonIcon>
              <ChevronRightIcon />
            </ButtonIcon>
          </Button>
        </PaginationNext>
      }
    />
  );
}
