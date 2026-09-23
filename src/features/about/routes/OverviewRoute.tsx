import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FolderTree } from '../components/FolderTree';
import { CI_BADGE_URL, CI_WORKFLOW_URL, LIVE_APP_URL, overview } from '../content/overview';
import { useLocalized } from '../localized';
import { REPO_URL } from '../source/repo';

export function Component() {
  const { t } = useTranslation();
  const pick = useLocalized();
  const title = pick(overview.title);
  const intro = pick(overview.intro);
  const tour = pick(overview.tour);
  const tourNote = pick(overview.tourNote);
  const folders = pick(overview.folders);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-heading text-heading-xs font-semibold">{title}</h1>
        {intro.map((paragraph) => (
          <p key={paragraph} className="text-body-sm text-txt-black-700">
            {paragraph}
          </p>
        ))}
        <div className="flex flex-wrap items-center gap-4">
          <a href={CI_WORKFLOW_URL}>
            <img src={CI_BADGE_URL} alt={t('about.overview.ciAlt')} />
          </a>
          <a
            href={LIVE_APP_URL}
            className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
          >
            {t('about.overview.liveDemo')}
          </a>
          <a
            href={REPO_URL}
            className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
          >
            {t('about.overview.repo')}
          </a>
        </div>
      </header>

      <section aria-labelledby="overview-stack-heading" className="flex flex-col gap-2">
        <h2 id="overview-stack-heading" className="font-heading text-body-lg font-semibold">
          {t('about.overview.stackHeading')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {overview.stack.map((item) => (
            <li
              key={item}
              className="rounded-full border border-otl-divider px-3 py-1 text-body-xs text-txt-black-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="overview-tour-heading" className="flex flex-col gap-2">
        <h2 id="overview-tour-heading" className="font-heading text-body-lg font-semibold">
          {t('about.overview.tourHeading')}
        </h2>
        <ul className="flex flex-col gap-1">
          {tour.map((link) => (
            <li key={link.href}>
              {link.href.startsWith('/') ? (
                <Link
                  to={link.href}
                  className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
                >
                  {link.label}
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className="text-body-xs text-txt-black-500">{tourNote}</p>
      </section>

      <section aria-labelledby="overview-folders-heading" className="flex flex-col gap-2">
        <h2 id="overview-folders-heading" className="font-heading text-body-lg font-semibold">
          {t('about.overview.foldersHeading')}
        </h2>
        <FolderTree folders={folders} />
      </section>
    </div>
  );
}
