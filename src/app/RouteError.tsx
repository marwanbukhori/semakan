import {
  Callout,
  CalloutAction,
  CalloutContent,
  CalloutTitle,
} from '@govtechmy/myds-react/callout';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : undefined;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Callout variant="danger">
        <CalloutTitle>{t('errors.route.title')}</CalloutTitle>
        <CalloutContent>
          {t('errors.route.body')}
          {detail && <span className="mt-1 block text-body-xs">{detail}</span>}
        </CalloutContent>
        <CalloutAction>
          <Link to="/applications" className="font-medium text-txt-primary underline">
            {t('errors.route.home')}
          </Link>
        </CalloutAction>
      </Callout>
    </div>
  );
}
