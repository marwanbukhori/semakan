import { Button } from '@govtechmy/myds-react/button';
import { useTranslation } from 'react-i18next';

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
