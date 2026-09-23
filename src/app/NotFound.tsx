import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-heading text-heading-xs font-semibold">{t('errors.notFound.title')}</h1>
      <p className="text-txt-black-700">{t('errors.notFound.body')}</p>
      <Link to="/applications" className="font-medium text-txt-primary underline">
        {t('errors.route.home')}
      </Link>
    </section>
  );
}
