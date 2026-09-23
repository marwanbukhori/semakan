import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@govtechmy/myds-react/table';
import { useTranslation } from 'react-i18next';
import {
  aiWorkflow,
  REVIEW_LOG_PATHS,
  REVIEW_LOG_README_PATH,
  type IncidentLink,
} from '../content/aiWorkflow';
import { useLocalized } from '../localized';
import { blobUrl, commitUrl } from '../source/repo';
import { linkClass } from '../components/linkClass';

function IncidentLinkItem({ link }: { link: IncidentLink }) {
  const { t } = useTranslation();
  if (link.kind === 'commit') {
    return (
      <a href={commitUrl(link.sha)} className={`text-body-sm ${linkClass}`}>
        {t('about.aiWorkflow.viewCommit', { sha: link.sha })}
      </a>
    );
  }
  return (
    <a href={blobUrl(REVIEW_LOG_PATHS[link.plan])} className={`text-body-sm ${linkClass}`}>
      {t('about.aiWorkflow.viewLog')} · {t('about.aiWorkflow.plan', { n: link.plan })}
    </a>
  );
}

export function Component() {
  const { t } = useTranslation();
  const pick = useLocalized();
  const intro = pick(aiWorkflow.intro);
  const pipelineLabel = t('about.aiWorkflow.pipeline');
  const caughtLabel = t('about.aiWorkflow.caught');

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-heading-xs font-semibold">
          {t('about.aiWorkflow.title')}
        </h1>
        <p className="text-body-sm text-txt-black-700">{intro}</p>
      </header>

      <section aria-labelledby="ai-workflow-pipeline-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-pipeline-heading" className="font-heading text-body-lg font-semibold">
          {pipelineLabel}
        </h2>
        <ol aria-label={pipelineLabel} className="flex flex-col gap-4">
          {aiWorkflow.pipeline.map((step) => (
            <li key={step.title.en} className="flex flex-col gap-1">
              <h3 className="font-heading text-body-md font-semibold">{pick(step.title)}</h3>
              <p className="text-body-sm text-txt-black-700">{pick(step.text)}</p>
              {step.path && (
                <a href={blobUrl(step.path)} className={`text-body-xs ${linkClass}`}>
                  {t('about.code.view')}
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ai-workflow-tools-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-tools-heading" className="font-heading text-body-lg font-semibold">
          {t('about.aiWorkflow.tools')}
        </h2>
        <ul className="flex flex-col gap-3">
          {aiWorkflow.tools.map((tool) => (
            <li key={tool.name.en}>
              <h3 className="font-heading text-body-md font-semibold">{pick(tool.name)}</h3>
              <p className="text-body-sm text-txt-black-700">{pick(tool.text)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ai-workflow-ownership-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-ownership-heading" className="font-heading text-body-lg font-semibold">
          {t('about.aiWorkflow.ownership')}
        </h2>
        <div
          // A scrollable region must be reachable by keyboard (axe: scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="region"
          aria-label={t('about.aiWorkflow.ownership')}
          className="overflow-x-auto"
        >
          <Table>
            <TableCaption className="sr-only">{t('about.aiWorkflow.ownership')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t('about.aiWorkflow.own')}</TableHead>
                <TableHead scope="col">{t('about.aiWorkflow.ai')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <ul className="flex flex-col gap-1">
                    {aiWorkflow.ownership.own.map((item) => (
                      <li key={item.en}>{pick(item)}</li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  <ul className="flex flex-col gap-1">
                    {aiWorkflow.ownership.ai.map((item) => (
                      <li key={item.en}>{pick(item)}</li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="ai-workflow-caught-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-caught-heading" className="font-heading text-body-lg font-semibold">
          {caughtLabel}
        </h2>
        <ol aria-label={caughtLabel} className="flex flex-col gap-4">
          {aiWorkflow.incidents.map((incident) => (
            <li
              key={incident.title.en}
              className="flex flex-col gap-2 rounded-md border border-otl-divider p-4"
            >
              <h3 className="font-heading text-body-md font-semibold">{pick(incident.title)}</h3>
              <p className="text-body-sm text-txt-black-700">{pick(incident.text)}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {incident.links.map((link) => (
                  <IncidentLinkItem
                    key={link.kind === 'commit' ? `commit-${link.sha}` : `log-${link.plan}`}
                    link={link}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ai-workflow-numbers-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-numbers-heading" className="font-heading text-body-lg font-semibold">
          {t('about.aiWorkflow.numbers')}
        </h2>
        <div
          // A scrollable region must be reachable by keyboard (axe: scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          role="region"
          aria-label={t('about.aiWorkflow.numbers')}
          className="overflow-x-auto"
        >
          <Table>
            <TableCaption className="sr-only">{t('about.aiWorkflow.numbers')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" />
                <TableHead scope="col">{t('about.aiWorkflow.tasks')}</TableHead>
                <TableHead scope="col">{t('about.aiWorkflow.fixRounds')}</TableHead>
                <TableHead scope="col">{t('about.aiWorkflow.rulings')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aiWorkflow.numbers.perPlan.map((row) => (
                <TableRow key={row.plan}>
                  <TableHead scope="row">{t('about.aiWorkflow.plan', { n: row.plan })}</TableHead>
                  <TableCell>{row.tasks}</TableCell>
                  <TableCell>{row.fixRounds}</TableCell>
                  <TableCell>{row.rulings}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableHead scope="row">{t('about.aiWorkflow.total')}</TableHead>
                <TableCell>{aiWorkflow.numbers.total.tasks}</TableCell>
                <TableCell>{aiWorkflow.numbers.total.fixRounds}</TableCell>
                <TableCell>{aiWorkflow.numbers.total.rulings}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="ai-workflow-logs-heading" className="flex flex-col gap-3">
        <h2 id="ai-workflow-logs-heading" className="font-heading text-body-lg font-semibold">
          {t('about.aiWorkflow.logs')}
        </h2>
        <ul className="flex flex-col gap-1">
          {([1, 2, 3] as const).map((plan) => (
            <li key={plan}>
              <a href={blobUrl(REVIEW_LOG_PATHS[plan])} className={`text-body-sm ${linkClass}`}>
                <code className="[overflow-wrap:anywhere]">{REVIEW_LOG_PATHS[plan]}</code>
              </a>
            </li>
          ))}
          <li>
            <a href={blobUrl(REVIEW_LOG_README_PATH)} className={`text-body-sm ${linkClass}`}>
              <code className="[overflow-wrap:anywhere]">{REVIEW_LOG_README_PATH}</code>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
