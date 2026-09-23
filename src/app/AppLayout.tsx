import { MoonIcon, SunIcon } from '@govtechmy/myds-react/icon';
import { ThemeSwitch } from '@govtechmy/myds-react/theme-switch';
import { AutoToast } from '@govtechmy/myds-react/toast';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { DevPanel } from './dev-panel/DevPanel';

export function AppLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-bg-white focus:px-3 focus:py-2 focus:shadow-card"
      >
        {t('app.skipToContent')}
      </a>
      <header className="border-b border-otl-divider">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-heading text-body-lg font-semibold">{t('app.name')}</p>
            <p className="text-body-xs text-txt-black-500">{t('app.tagline')}</p>
          </div>
          <nav aria-label={t('app.nav.label')} className="flex items-center gap-4">
            <NavLink
              to="/applications"
              className={({ isActive }) =>
                isActive ? 'font-semibold text-txt-primary' : 'text-txt-black-700 hover:underline'
              }
            >
              {t('app.nav.applications')}
            </NavLink>
          </nav>
          {/* MYDS names the toggle after the current theme's label, so the labels are translated. */}
          <ThemeSwitch
            themes={[
              { label: t('app.theme.light'), value: 'light', icon: <SunIcon /> },
              { label: t('app.theme.dark'), value: 'dark', icon: <MoonIcon /> },
            ]}
          />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <DevPanel />
      <AutoToast />
    </div>
  );
}
