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
      // Radix's modal Dialog (the default) hides the rest of the page from the
      // accessibility tree via aria-hidden while it is open, which would also
      // hide the detail page underneath — the one place this dialog's data
      // updates live. Non-modal keeps that page inspectable and interactive
      // behind the dialog; initial autofocus into the dialog still happens,
      // and clicking outside the dialog content still dismisses it.
      modal={false}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogBody hideClose>
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
