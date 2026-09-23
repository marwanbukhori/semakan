import { Button } from '@govtechmy/myds-react/button';
import { Checkbox } from '@govtechmy/myds-react/checkbox';
import { Label } from '@govtechmy/myds-react/label';
import { Radio, RadioButton, RadioItem, RadioLabel } from '@govtechmy/myds-react/radio';
import { TextArea } from '@govtechmy/myds-react/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type UseFormRegisterReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/shared/api/ApiError';
import { reviewErrorKey } from '../rules';
import { DOCUMENT_KINDS, ReviewDecisionSchema } from '../schemas';
import type { Decision, ReviewDecision, ReviewDecisionInput } from '../types';

const FORM_FIELDS = ['decision', 'reason', 'note', 'requestedInfo'] as const;
type FormField = (typeof FORM_FIELDS)[number];
const isFormField = (key: string): key is FormField =>
  (FORM_FIELDS as readonly string[]).includes(key);

// Visual order of the fields, used to pick which one gets focus when several
// are invalid at once. 'root.server' (a decision-level rule the server
// enforced) is last: it has no single control of its own.
const FOCUS_ORDER = ['decision', 'reason', 'requestedInfo', 'note', 'root.server'] as const;

/** The DOM id of the control to focus for a given field, given the current decision. */
function fieldElementId(name: FormField, decisionValue: Decision | undefined): string {
  switch (name) {
    case 'decision':
      // Focus the checked radio (or 'approve', the default) rather than
      // the group itself: Radix's radiogroup root is not focusable.
      return `decision-${decisionValue ?? 'approve'}`;
    case 'reason':
      return 'review-reason';
    case 'requestedInfo':
      return `requested-${DOCUMENT_KINDS[0]}`;
    case 'note':
      return 'review-note';
  }
}

type ReviewFormProps = {
  isSubmitting: boolean;
  onSubmit: (review: ReviewDecision) => Promise<void>;
  onCancel: () => void;
};

export function ReviewForm({ isSubmitting, onSubmit, onCancel }: ReviewFormProps) {
  const { t } = useTranslation();
  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    getFieldState,
    formState,
  } = useForm<ReviewDecisionInput, unknown, ReviewDecision>({
    resolver: zodResolver(ReviewDecisionSchema),
    defaultValues: { decision: 'approve', note: '' },
  });
  const decision = useWatch({ control, name: 'decision' });
  const submitRef = useRef<HTMLButtonElement>(null);

  // getFieldState works for every branch of the union without casting `errors`.
  const errorCode = (name: FormField) => getFieldState(name, formState).error?.message;
  const serverError = formState.errors.root?.server?.message;

  // Neither the decision radiogroup nor the requestedInfo checkboxes are
  // native inputs react-hook-form can focus automatically (Radix group
  // roots are not focusable), so focus is moved by hand, in visual order.
  function focusFirstError(names: Iterable<string>) {
    const present = new Set(names);
    for (const name of FOCUS_ORDER) {
      if (!present.has(name)) continue;
      if (name === 'root.server') {
        // role="alert" already announces the message; returning focus to
        // the submit button (where it already was) keeps the officer's
        // keyboard position instead of jumping to a non-interactive node.
        submitRef.current?.focus();
      } else {
        document.getElementById(fieldElementId(name, getValues('decision')))?.focus();
      }
      return;
    }
  }

  function onInvalid(errors: FieldErrors<ReviewDecisionInput>) {
    focusFirstError(Object.keys(errors));
  }

  async function submit(review: ReviewDecision) {
    try {
      await onSubmit(review);
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== 'validation') return;
      const touched = new Set<string>();
      for (const [key, codes] of Object.entries(error.fieldErrors)) {
        const code = codes[0] ?? 'unknown';
        if (isFormField(key)) {
          setError(key, { type: 'server', message: code });
          touched.add(key);
        } else {
          setError('root.server', { type: 'server', message: code });
          touched.add('root.server');
        }
      }
      focusFirstError(touched);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit, onInvalid)(event)}
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
              onValueChange={(value) => {
                field.onChange(value);
                // The previous branch's errors no longer apply; typed text
                // in `reason`/`note`/`requestedInfo` is kept so switching
                // back restores it.
                clearErrors();
              }}
              name={field.name}
              aria-labelledby="decision-legend"
              aria-describedby={errorCode('decision') ? 'decision-error' : undefined}
            >
              {(['approve', 'reject', 'request_info'] as const).map((value) => (
                <RadioItem key={value}>
                  <RadioButton
                    id={`decision-${value}`}
                    value={value}
                    aria-invalid={errorCode('decision') ? true : undefined}
                  />
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
        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={errorCode('requestedInfo') ? 'requested-info-error' : undefined}
        >
          <legend className="mb-1 text-body-sm font-medium">{t('review.requestedInfo')}</legend>
          <Controller
            control={control}
            name="requestedInfo"
            // Its own default: this field exists only in one branch of the union.
            defaultValue={[]}
            render={({ field }) => {
              const selected = field.value ?? [];
              const invalid = errorCode('requestedInfo') ? true : undefined;
              return (
                <>
                  {DOCUMENT_KINDS.map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                      <Checkbox
                        id={`requested-${kind}`}
                        checked={selected.includes(kind)}
                        aria-invalid={invalid}
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

      {serverError && <FieldError id="review-server-error" code={serverError} alert />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="default-outline" onClick={onCancel}>
          {t('review.cancel')}
        </Button>
        <Button ref={submitRef} type="submit" variant="primary-fill" disabled={isSubmitting}>
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

function FieldError({
  id,
  code,
  alert = false,
}: {
  id: string;
  code: string | undefined;
  /** The form-level server error is a live region so it is announced. */
  alert?: boolean;
}) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <p id={id} role={alert ? 'alert' : undefined} className="text-body-sm text-txt-danger">
      {t(reviewErrorKey(code))}
    </p>
  );
}
