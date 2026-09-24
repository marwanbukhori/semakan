import { Tag } from '@govtechmy/myds-react/tag';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { assertNever } from '@/shared/lib/assertNever';
import type { ApplicationStatus } from '../types';

type TagVariant = NonNullable<ComponentProps<typeof Tag>['variant']>;

/** Adding a status to the schema without mapping it here is a compile error. */
export function statusVariant(status: ApplicationStatus): TagVariant {
  switch (status) {
    case 'submitted':
      return 'default';
    case 'under_review':
      return 'primary';
    case 'info_requested':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return assertNever(status);
  }
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  return (
    <Tag variant={statusVariant(status)} size="small" mode="pill" dot>
      {t(`status.${status}`)}
    </Tag>
  );
}
