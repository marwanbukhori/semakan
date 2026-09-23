import { Button } from '@govtechmy/myds-react/button';
import { Checkbox } from '@govtechmy/myds-react/checkbox';
import { Label } from '@govtechmy/myds-react/label';
import { Radio, RadioButton, RadioItem, RadioLabel } from '@govtechmy/myds-react/radio';
import { TextArea } from '@govtechmy/myds-react/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/shared/api/ApiError';
import { reviewErrorKey } from '../rules';
import { DOCUMENT_KINDS, ReviewDecisionSchema } from '../schemas';
import type { ReviewDecision, ReviewDecisionInput } from '../types';

const FORM_FIELDS = ['decision', 'reason', 'note', 'requestedInfo'] as const;
type FormField = (typeof FORM_FIELDS)[number];
const isFormField = (key: string): key is FormField =>
  (FORM_FIELDS as readonly string[]).includes(key);

type ReviewFormProps = {
  isSubmitting: boolean;
  onSubmit: (review: ReviewDecision) => Promise<void>;
  onCancel: () => void;
};

export function ReviewForm({ isSubmitting, onSubmit, onCancel }: ReviewFormProps) {
  const { t } = useTranslation();
  const { control, register, handleSubmit, setError, getFieldState, formState } = useForm<
    ReviewDecisionInput,
    unknown,
    ReviewDecision
  >({
    resolver: zodResolver(ReviewDecisionSchema),
    defaultValues: { decision: 'approve', note: '' },
  });
  const decision = useWatch({ control, name: 'decision' });

  // getFieldState works for every branch of the union without casting `errors`.
  const errorCode = (name: FormField) => getFieldState(name, formState).error?.message;
  const serverError = formState.errors.root?.server?.message;

  async function submit(review: ReviewDecision) {
    try {
      await onSubmit(review);
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== 'validation') return;
      for (const [key, codes] of Object.entries(error.fieldErrors)) {
        const code = codes[0] ?? 'unknown';
        if (isFormField(key)) setError(key, { type: 'server', message: code });
        else setError('root.server', { type: 'server', message: code });
      }
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend id="decision-legend" className="mb-1 text-body-sm font-medium">
          {t('review.decision')}
        </legend>
        <Controller
          control={control}
          name="decision"
          render={({ field }) => (
            <Radio
              value={field.value}
              onValueChange={field.onChange}
              name={field.name}
              aria-labelledby="decision-legend"
              aria-describedby={errorCode('decision') ? 'decision-error' : undefined}
            >
              {(['approve', 'reject', 'request_info'] as const).map((value) => (
                <RadioItem key={value}>
                  <RadioButton id={`decision-${value}`} value={value} />
                  <RadioLabel htmlFor={`decision-${value}`}>
                    {t(`review.decisions.${value}`)}
                  </RadioLabel>
                </RadioItem>
              ))}
            </Radio>
          )}
        />
        <FieldError id="decision-error" code={errorCode('decision')} />
      </fieldset>

      {decision === 'reject' && (
        <TextField
          id="review-reason"
          label={t('review.reason')}
          code={errorCode('reason')}
          registration={register('reason')}
        />
      )}

      {decision === 'request_info' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-body-sm font-medium">{t('review.requestedInfo')}</legend>
          <Controller
            control={control}
            name="requestedInfo"
            // Its own default: this field exists only in one branch of the union.
            defaultValue={[]}
            render={({ field }) => {
              const selected = field.value ?? [];
              return (
                <>
                  {DOCUMENT_KINDS.map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                      <Checkbox
                        id={`requested-${kind}`}
                        checked={selected.includes(kind)}
                        onCheckedChange={(next) =>
                          field.onChange(
                            next === true
                              ? [...selected, kind]
                              : selected.filter((k) => k !== kind),
                          )
                        }
                      />
                      <Label htmlFor={`requested-${kind}`}>{t(`documents.${kind}`)}</Label>
                    </div>
                  ))}
                </>
              );
            }}
          />
          <FieldError id="requested-info-error" code={errorCode('requestedInfo')} />
        </fieldset>
      )}

      {decision !== 'reject' && (
        <TextField
          id="review-note"
          label={decision === 'request_info' ? t('review.noteRequired') : t('review.note')}
          code={errorCode('note')}
          registration={register('note')}
        />
      )}

      {serverError && <FieldError id="review-server-error" code={serverError} />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="default-outline" onClick={onCancel}>
          {t('review.cancel')}
        </Button>
        <Button type="submit" variant="primary-fill" disabled={isSubmitting}>
          {isSubmitting ? t('review.submitting') : t('review.submit')}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  id,
  label,
  code,
  registration,
}: {
  id: string;
  label: string;
  code: string | undefined;
  registration: UseFormRegisterReturn;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <TextArea
        id={id}
        rows={3}
        aria-invalid={code ? true : undefined}
        aria-describedby={code ? errorId : undefined}
        {...registration}
      />
      <FieldError id={errorId} code={code} />
    </div>
  );
}

function FieldError({ id, code }: { id: string; code: string | undefined }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <p id={id} className="text-body-sm text-txt-danger">
      {t(reviewErrorKey(code))}
    </p>
  );
}
