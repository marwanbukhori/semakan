import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import type { CatalogueMeta } from '../types';

export const FUEL_DATASET_URL = 'https://data.gov.my/data-catalogue/fuelprice';

export function DataFreshness({ meta }: { meta: CatalogueMeta }) {
  const { t, i18n } = useTranslation();
  return (
    <footer className="flex flex-col gap-1 border-t border-otl-divider pt-3 text-body-sm text-txt-black-500">
      <p>
        {t('fuel.freshness.asOf', { date: formatDateTime(meta.data_as_of, i18n.language) })} ·{' '}
        {t('fuel.freshness.next', { date: formatDate(meta.next_update, i18n.language) })}
      </p>
      <p>{t('fuel.freshness.source', { source: meta.data_source.join(', ') })}</p>
      <a
        href={FUEL_DATASET_URL}
        className="font-medium text-txt-primary underline underline-offset-2"
      >
        {t('fuel.freshness.link')}
      </a>
    </footer>
  );
}
