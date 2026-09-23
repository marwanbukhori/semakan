import { DocumentIcon } from '@govtechmy/myds-react/icon';
import { useTranslation } from 'react-i18next';
import type { ApplicationDocument } from '../types';

export function DocumentList({ documents }: { documents: readonly ApplicationDocument[] }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-otl-divider rounded-lg border border-otl-divider">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-body-sm">
          <span className="flex min-w-0 items-start gap-2">
            <DocumentIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-txt-black-500"
            />
            <span className="flex min-w-0 flex-col">
              {t(`documents.${doc.kind}`)}
              <span className="text-body-xs text-txt-black-500 [overflow-wrap:anywhere]">
                {doc.fileName}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-txt-black-500">
            {t('applications.detail.documentSize', { size: doc.sizeKb })}
          </span>
        </li>
      ))}
    </ul>
  );
}
