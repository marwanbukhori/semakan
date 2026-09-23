import { useTranslation } from 'react-i18next';
import { CodeExcerpt } from '../components/CodeExcerpt';
import { PracticeStatus } from '../components/PracticeStatus';
import { PRACTICES } from '../content/practices';
import { useLocalized } from '../localized';

export function Component() {
  const { t } = useTranslation();
  const pick = useLocalized();

  const enforced = PRACTICES.filter((practice) => practice.status === 'enforced').length;
  const partial = PRACTICES.filter((practice) => practice.status === 'partial').length;
  const planned = PRACTICES.filter((practice) => practice.status === 'planned').length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-heading-xs font-semibold">{t('about.practices.title')}</h1>
        <p className="text-body-sm text-txt-black-700">{t('about.practices.intro')}</p>
        <p className="text-body-sm text-txt-black-500">
          {t('about.practices.summary', { enforced, partial, planned })}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {PRACTICES.map((practice) => {
          const headingId = `practice-${practice.id}-heading`;
          return (
            <article
              key={practice.id}
              aria-labelledby={headingId}
              className="flex flex-col gap-3 rounded-md border border-otl-divider p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={headingId} className="font-heading text-body-lg font-semibold">
                  {pick(practice.title)}
                </h2>
                <PracticeStatus status={practice.status} plan={practice.plan} />
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt className="text-body-xs font-semibold text-txt-black-500">
                    {t('about.practices.what')}
                  </dt>
                  <dd className="text-body-sm text-txt-black-700">{pick(practice.what)}</dd>
                </div>
                <div>
                  <dt className="text-body-xs font-semibold text-txt-black-500">
                    {t('about.practices.why')}
                  </dt>
                  <dd className="text-body-sm text-txt-black-700">{pick(practice.why)}</dd>
                </div>
                <div>
                  <dt className="text-body-xs font-semibold text-txt-black-500">
                    {t('about.practices.enforcedBy')}
                  </dt>
                  <dd className="text-body-sm text-txt-black-700">{pick(practice.enforcedBy)}</dd>
                </div>
              </dl>

              <CodeExcerpt path={practice.source.path} region={practice.source.region} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
