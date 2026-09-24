import { useToast } from '@govtechmy/myds-react/hooks';
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from '@govtechmy/myds-react/icon';
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  type ToastEvent,
} from '@govtechmy/myds-react/toast';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DURATION_MS = 5000;

const ICONS = {
  success: <CheckCircleIcon aria-hidden="true" className="size-5 shrink-0 text-txt-success" />,
  info: <InfoIcon aria-hidden="true" className="size-5 shrink-0 text-txt-primary" />,
  warning: <WarningCircleIcon aria-hidden="true" className="size-5 shrink-0 text-txt-warning" />,
  error: <WarningIcon aria-hidden="true" className="size-5 shrink-0 text-txt-danger" />,
  message: null,
} as const;

const BARS = {
  success: 'bg-txt-success',
  info: 'bg-txt-primary',
  warning: 'bg-txt-warning',
  error: 'bg-txt-danger',
  message: 'bg-bg-washed',
} as const;

/**
 * Shows toasts sent with MYDS `useToast().toast(...)`. It replaces MYDS
 * `AutoToast`, whose Radix labels are hardcoded English ("Notification",
 * "Notifications (F8)"), whose close button has no accessible name, and whose
 * icon and progress bar are unnamed `img`/`progressbar` roles.
 */
export function AppToaster() {
  const { t } = useTranslation();
  const { toasts, subscribe, unsubscribe } = useToast();
  // useToast() returns new subscribe/unsubscribe functions every render, each
  // bound to that render's handler, so the pair from the first render is kept:
  // unsubscribe must remove the exact handler subscribe added.
  const [emitter] = useState(() => ({ subscribe, unsubscribe }));
  useEffect(() => {
    emitter.subscribe();
    return emitter.unsubscribe;
  }, [emitter]);

  return (
    <ToastProvider label={t('toast.label')} duration={DURATION_MS}>
      {toasts.map((toast: ToastEvent, index) => {
        const variant = toast.variant ?? 'message';
        return (
          // useToast() only ever appends, so an index is a stable key. Radix
          // unmounts a closed toast's DOM once its exit animation ends.
          <ToastRoot key={index} variant={variant} duration={DURATION_MS}>
            {ICONS[variant]}
            <div className="space-y-1">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            </div>
            <ToastClose aria-label={t('toast.dismiss')} />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-full animate-expire group-hover:paused group-hover:transition-none"
              style={{ animationDuration: `${DURATION_MS}ms` }}
            >
              <div className={`h-1 w-full ${BARS[variant]}`} />
            </div>
          </ToastRoot>
        );
      })}
      {/* Lifted above the Dev Panel toggle (fixed at bottom-4 right-4) so neither covers the other. */}
      <ToastViewport label={t('toast.region')} className="bottom-12" />
    </ToastProvider>
  );
}
