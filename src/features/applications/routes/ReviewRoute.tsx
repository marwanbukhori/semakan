import { Button } from '@govtechmy/myds-react/button';
import {
  Callout,
  CalloutAction,
  CalloutContent,
  CalloutTitle,
} from '@govtechmy/myds-react/callout';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@govtechmy/myds-react/dialog';
import { useToast } from '@govtechmy/myds-react/hooks';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/shared/api/ApiError';
import { apiErrorMessageKey } from '@/shared/api/errorMessage';
import { useReviewApplication } from '../api/mutations';
import { useApplication } from '../api/queries';
import { ReviewForm } from '../components/ReviewForm';
import { isReviewable } from '../rules';
import type { ReviewDecision } from '../types';

/** A route that renders as a dialog: it has a URL, Back closes it, and focus is trapped inside. */
export function Component() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id = '' } = useParams<'id'>();
  const { data, refetch } = useApplication(id);
  const review = useReviewApplication(id);

  const close = () => {
    void navigate('..');
  };

  // The detail page (the parent route) owns loading and not-found states.
  if (!data) return null;
  if (!isReviewable(data.status) && review.isIdle) return <Navigate to=".." replace />;

  async function submit(decision: ReviewDecision) {
    if (!data) return;
    try {
      const saved = await review.mutateAsync({ version: data.version, review: decision });
      toast({
        variant: 'success',
        title: t(`review.success.${decision.decision}`),
        description: t('review.successBody', {
          reference: saved.referenceNo,
          status: t(`status.${saved.status}`),
        }),
      });
      close();
    } catch (error) {
      if (!(
        error instanceof ApiError &&
        (error.kind === 'validation' || error.kind === 'conflict')
      )) {
        toast({ variant: 'error', title: t('review.errorToast') });
      }
      throw error;
    }
  }

  const error = review.error;
  const isConflict = error instanceof ApiError && error.kind === 'conflict';
  const isOtherFailure =
    error !== null && !isConflict && !(error instanceof ApiError && error.kind === 'validation');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogBody
        hideClose
        // The dialog opens from a URL, not a Radix trigger, so Radix has nothing
        // to return focus to. Send it to the Review link, or to the heading once
        // the application is closed and the link is gone.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (
            document.getElementById('review-link') ?? document.getElementById('application-heading')
          )?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('review.title', { reference: data.referenceNo })}</DialogTitle>
          <DialogDescription>{t('review.description')}</DialogDescription>
        </DialogHeader>
        <DialogContent className="flex flex-col gap-4">
          {isConflict && (
            <Callout variant="warning">
              <CalloutTitle>{t('review.conflictTitle')}</CalloutTitle>
              <CalloutContent>{t('review.conflictBody')}</CalloutContent>
              <CalloutAction>
                <Button variant="default-outline" size="small" onClick={() => void refetch()}>
                  {t('review.reload')}
                </Button>
              </CalloutAction>
            </Callout>
          )}
          {isOtherFailure && (
            <Callout variant="danger">
              <CalloutTitle>{t('review.failedTitle')}</CalloutTitle>
              <CalloutContent>{t(apiErrorMessageKey(error))}</CalloutContent>
            </Callout>
          )}
          <ReviewForm isSubmitting={review.isPending} onSubmit={submit} onCancel={close} />
        </DialogContent>
      </DialogBody>
    </Dialog>
  );
}
