import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';

const SECTIONS = [
  { to: '/about', key: 'overview', end: true },
  { to: '/about/architecture', key: 'architecture', end: false },
  { to: '/about/practices', key: 'practices', end: false },
  { to: '/about/experience', key: 'experience', end: false },
  { to: '/about/ai-workflow', key: 'aiWorkflow', end: false },
] as const;

export function Component() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8">
      <nav
        aria-label={t('about.nav.label')}
        className="overflow-x-auto border-b border-otl-divider"
      >
        <ul className="flex gap-1 whitespace-nowrap">
          {SECTIONS.map((section) => (
            <li key={section.key}>
              <NavLink
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  `inline-block border-b-2 px-3 py-2 text-body-sm font-medium ${
                    isActive
                      ? 'border-otl-primary-300 text-txt-primary'
                      : 'border-transparent text-txt-black-700 hover:text-txt-black-900'
                  }`
                }
              >
                {t(`about.nav.${section.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
