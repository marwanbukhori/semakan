import { Button } from '@govtechmy/myds-react/button';
import {
  Callout,
  CalloutAction,
  CalloutContent,
  CalloutTitle,
} from '@govtechmy/myds-react/callout';
import { useTranslation } from 'react-i18next';
import { apiErrorMessageKey } from '@/shared/api/errorMessage';

// #region practice:async-states
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
// #endregion
