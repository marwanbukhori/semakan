import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation();
  return <h1 className="font-heading text-heading-xs font-semibold">{t('about.nav.overview')}</h1>;
}
