import { Tag } from '@govtechmy/myds-react/tag';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { assertNever } from '@/shared/lib/assertNever';
import type { PracticeStatus as Status } from '../content/practices';

type TagVariant = NonNullable<ComponentProps<typeof Tag>['variant']>;

/** Adding a status without mapping it here is a compile error. */
export function statusVariant(status: Status): TagVariant {
  switch (status) {
    case 'enforced':
      return 'success';
    case 'partial':
      return 'warning';
    case 'planned':
      return 'default';
    default:
      return assertNever(status);
  }
}

/** The status is always shown in words, never colour alone. */
export function PracticeStatus({ status, plan }: { status: Status; plan?: number }) {
  const { t } = useTranslation();
  return (
    <Tag variant={statusVariant(status)} size="small" mode="pill" dot>
      {t(`about.status.${status}`)}
      {plan !== undefined ? ` · ${t('about.status.plan', { plan })}` : null}
    </Tag>
  );
}
