import { Spinner } from '@govtechmy/myds-react/spinner';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function DetailLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3">
      <Spinner size="medium" />
      <span className="text-body-sm text-txt-black-500">{t('applications.detail.loading')}</span>
    </div>
  );
}

export function DetailNotFound() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-heading text-heading-xs font-semibold">
        {t('applications.detail.notFoundTitle')}
      </h1>
      <p className="text-txt-black-700">{t('applications.detail.notFoundBody')}</p>
      <Link to="/applications" className="font-medium text-txt-primary underline">
        {t('errors.route.home')}
      </Link>
    </section>
  );
}
