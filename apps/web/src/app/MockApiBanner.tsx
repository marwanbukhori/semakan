import { useTranslation } from 'react-i18next';

/** Shown above the app when the in-browser mock API (the demo's only backend) failed to start. */
export function MockApiBanner() {
  const { t } = useTranslation();
  return (
    <p role="alert" className="bg-bg-danger-50 px-4 py-2 text-center text-body-sm text-txt-danger">
      {t('app.mockApiFailed')}
    </p>
  );
}
