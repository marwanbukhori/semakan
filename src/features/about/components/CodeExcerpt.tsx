import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { aboutKeys } from '../source/keys';
import { loadSource } from '../source/files';
import { extractRegion } from '../source/regions';
import { blobUrl } from '../source/repo';

export function CodeExcerpt({ path, region }: { path: string; region: string }) {
  const { t } = useTranslation();
  const { data, isPending } = useQuery({
    queryKey: aboutKeys.source(path),
    queryFn: () => loadSource(path),
    staleTime: Infinity,
  });
  const excerpt = data === undefined ? null : extractRegion(data, region);

  return (
    <figure className="overflow-hidden rounded-md border border-otl-divider">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-otl-divider bg-bg-washed px-3 py-2 text-body-xs">
        <code className="text-txt-black-700">{path}</code>
        <a
          href={blobUrl(path, excerpt ?? undefined)}
          className="font-medium text-txt-primary underline underline-offset-2"
        >
          {excerpt
            ? t('about.code.viewLines', { start: excerpt.startLine, end: excerpt.endLine })
            : t('about.code.view')}
        </a>
      </figcaption>
      <ExcerptBody isPending={isPending} code={excerpt?.code} />
    </figure>
  );
}

function ExcerptBody({ isPending, code }: { isPending: boolean; code: string | undefined }) {
  const { t } = useTranslation();
  if (isPending)
    return <p className="p-3 text-body-sm text-txt-black-500">{t('about.code.loading')}</p>;
  if (code === undefined) {
    return (
      <p role="alert" className="p-3 text-body-sm text-txt-danger">
        {t('about.code.missing')}
      </p>
    );
  }
  return (
    <pre
      // A scrollable region must be reachable by keyboard (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="overflow-x-auto p-3 text-body-xs leading-relaxed focus-visible:outline-none focus-visible:ring focus-visible:ring-fr-primary"
    >
      <code>{code}</code>
    </pre>
  );
}
