import { useTranslation } from 'react-i18next';

/** A missing value spoken as "Not available", not silence or a bare dash. */
export function NoValue() {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t('fuel.table.noValue')}</span>
    </>
  );
}
