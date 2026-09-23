import { Button } from '@govtechmy/myds-react/button';
import {
  Callout,
  CalloutAction,
  CalloutContent,
  CalloutTitle,
} from '@govtechmy/myds-react/callout';
import { useTranslation } from 'react-i18next';
import { apiErrorMessageKey } from '@/shared/api/errorMessage';

export function LoadError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Callout variant="danger">
      <CalloutTitle>{title}</CalloutTitle>
      <CalloutContent>{t(apiErrorMessageKey(error))}</CalloutContent>
      <CalloutAction>
        <Button variant="default-outline" size="small" onClick={onRetry}>
          {t('errors.retry')}
        </Button>
      </CalloutAction>
    </Callout>
  );
}

export function EmptyResults({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="font-semibold">{t('applications.empty.title')}</p>
      <p className="text-body-sm text-txt-black-500">
        {hasActiveFilters ? t('applications.empty.filtered') : t('applications.empty.unfiltered')}
      </p>
      {hasActiveFilters && (
        <Button variant="primary-outline" size="small" onClick={onClear}>
          {t('applications.empty.clear')}
        </Button>
      )}
    </div>
  );
}
