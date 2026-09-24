import { useTranslation } from 'react-i18next';
import { assertNever } from '@/shared/lib/assertNever';
import { formatDateTime } from '@/shared/lib/format';
import type { TimelineEvent } from '../types';

export function Timeline({ events }: { events: readonly TimelineEvent[] }) {
  const { i18n } = useTranslation();
  return (
    <ol className="flex flex-col gap-5 border-l border-otl-divider pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-bg-primary-600"
          />
          <TimelineEntry event={event} />
          <time dateTime={event.at} className="text-body-xs text-txt-black-500">
            {formatDateTime(event.at, i18n.language)}
          </time>
        </li>
      ))}
    </ol>
  );
}

// #region practice:exhaustive-switch
/** One case per event kind; adding a kind to the schema without rendering it is a compile error. */
function TimelineEntry({ event }: { event: TimelineEvent }) {
  const { t } = useTranslation();
  const note = (text: string | null) =>
    text ? <p className="mt-1 text-body-sm text-txt-black-700">{text}</p> : null;

  switch (event.kind) {
    case 'submitted':
      return (
        <p className="text-body-sm font-medium">
          {t('timeline.submitted', { actor: event.actor })}
        </p>
      );
    case 'status_changed':
      return (
        <>
          <p className="text-body-sm font-medium">
            {t('timeline.status_changed', {
              actor: event.actor,
              from: t(`status.${event.from}`),
              to: t(`status.${event.to}`),
            })}
          </p>
          {note(event.note)}
        </>
      );
    case 'info_requested':
      return (
        <>
          <p className="text-body-sm font-medium">
            {t('timeline.info_requested', { actor: event.actor })}
          </p>
          <p className="mt-1 text-body-sm">
            {t('timeline.requested', {
              documents: event.requestedInfo.map((kind) => t(`documents.${kind}`)).join(', '),
            })}
          </p>
          {note(event.note)}
        </>
      );
    case 'comment':
      return (
        <>
          <p className="text-body-sm font-medium">
            {t('timeline.comment', { actor: event.actor })}
          </p>
          {note(event.note)}
        </>
      );
    default:
      return assertNever(event);
  }
}
// #endregion
