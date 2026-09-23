import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeExcerpt } from '../components/CodeExcerpt';
import { architecture } from '../content/architecture';
import { useLocalized } from '../localized';
import { blobUrl } from '../source/repo';
import { linkClass } from '../components/linkClass';

export function Component() {
  const { t } = useTranslation();
  const pick = useLocalized();
  const title = pick(architecture.title);
  const intro = pick(architecture.intro);
  const diagramLabel = pick(architecture.diagramLabel);
  const traceTitle = pick(architecture.trace.title);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-heading-xs font-semibold">{title}</h1>
        <p className="text-body-sm text-txt-black-700">{intro}</p>
      </header>

      <section aria-labelledby="architecture-layers-heading" className="flex flex-col gap-4">
        <h2 id="architecture-layers-heading" className="font-heading text-body-lg font-semibold">
          {t('about.architecture.layersHeading')}
        </h2>
        <figure
          aria-labelledby="architecture-diagram-caption"
          className="flex flex-col items-center gap-0"
        >
          {architecture.layers.map((layer, index) => (
            <Fragment key={layer.paths[0]}>
              <div className="flex w-full max-w-xl flex-col gap-2 rounded-md border border-otl-divider bg-bg-washed p-4">
                <h3 className="font-heading text-body-md font-semibold">{pick(layer.name)}</h3>
                <p className="text-body-sm text-txt-black-700">{pick(layer.text)}</p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {layer.paths.map((path) => (
                    <li key={path}>
                      <a href={blobUrl(path)} className={`text-body-xs ${linkClass}`}>
                        <code>{path}</code>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              {index < architecture.layers.length - 1 && (
                <span aria-hidden="true" className="py-1 text-heading-2xs leading-none">
                  ↓
                </span>
              )}
            </Fragment>
          ))}
          <figcaption
            id="architecture-diagram-caption"
            className="mt-2 max-w-xl text-body-xs text-txt-black-500"
          >
            {diagramLabel}
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="architecture-trace-heading" className="flex flex-col gap-3">
        <h2 id="architecture-trace-heading" className="font-heading text-body-lg font-semibold">
          {traceTitle}
        </h2>
        <ol aria-label={traceTitle} className="flex flex-col gap-4">
          {architecture.trace.steps.map((step) => (
            <li key={step.path} className="flex flex-col gap-2">
              <h3 className="font-heading text-body-md font-semibold">{pick(step.title)}</h3>
              <p className="text-body-sm text-txt-black-700">{pick(step.text)}</p>
              {step.region ? (
                <CodeExcerpt path={step.path} region={step.region} />
              ) : (
                <a href={blobUrl(step.path)} className={`text-body-xs ${linkClass}`}>
                  {t('about.code.view')}
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
