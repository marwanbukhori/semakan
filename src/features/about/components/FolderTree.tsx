import { useTranslation } from 'react-i18next';
import type { FolderEntry } from '../content/overview';
import { useLocalized } from '../localized';
import { treeUrl } from '../source/repo';

/**
 * Native <details>/<summary> per folder: keyboard-operable (Enter/Space on the
 * summary toggles it) with no custom key handling needed.
 */
export function FolderTree({ folders }: { folders: FolderEntry[] }) {
  const { t } = useTranslation();
  const pick = useLocalized();
  return (
    <ul className="flex flex-col divide-y divide-otl-divider rounded-md border border-otl-divider">
      {folders.map((folder) => (
        <li key={folder.path}>
          <details className="p-3">
            <summary className="cursor-pointer text-body-sm font-medium text-txt-black-900">
              <code>{folder.path}</code>
            </summary>
            <div className="mt-2 flex flex-col gap-2 pl-4">
              <p className="text-body-sm text-txt-black-700">{pick(folder.text)}</p>
              <a
                href={treeUrl(folder.path)}
                className="text-body-xs font-medium text-txt-primary underline underline-offset-2"
              >
                {t('about.code.view')}
              </a>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
