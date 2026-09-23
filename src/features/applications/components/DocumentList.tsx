import { DocumentIcon } from '@govtechmy/myds-react/icon';
import { useTranslation } from 'react-i18next';
import type { ApplicationDocument } from '../types';

export function DocumentList({ documents }: { documents: readonly ApplicationDocument[] }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-otl-divider rounded-lg border border-otl-divider">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-body-sm">
          <span className="flex items-center gap-2">
            <DocumentIcon aria-hidden="true" className="size-4 text-txt-black-500" />
            {t(`documents.${doc.kind}`)}
          </span>
          <span className="text-txt-black-500">
            {t('applications.detail.documentSize', { size: doc.sizeKb })}
          </span>
        </li>
      ))}
    </ul>
  );
}
