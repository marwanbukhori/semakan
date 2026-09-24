import { useTranslation } from 'react-i18next';
import { ProjectCard } from '../components/ProjectCard';
import { RequirementsMap } from '../components/RequirementsMap';
import { RoleSwitch } from '../components/RoleSwitch';
import { PROJECTS } from '../content/experience';
import type { Role } from '../content/requirements';
import { useRole } from '../hooks/useRole';

/** Only projects with a facet for the active role are shown; content order is otherwise kept. */
function projectsFor(role: Role) {
  return PROJECTS.filter((project) => project[role] !== undefined);
}

export function Component() {
  const { t } = useTranslation();
  const { role, setRole } = useRole();
  const roleProjects = projectsFor(role);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-heading-xs font-semibold">
          {t('about.experience.title')}
        </h1>
        <p className="text-body-sm text-txt-black-700">{t('about.experience.intro')}</p>
      </header>

      <RoleSwitch role={role} onRoleChange={setRole} />

      <section aria-labelledby="projects-heading" className="flex flex-col gap-6">
        <h2 id="projects-heading" className="font-heading text-body-lg font-semibold">
          {t('about.experience.projects')}
        </h2>
        {roleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} role={role} />
        ))}
      </section>

      <section aria-labelledby="requirements-map-heading" className="flex flex-col gap-3">
        <h2 id="requirements-map-heading" className="font-heading text-body-lg font-semibold">
          {t('about.experience.mapTitle')}
        </h2>
        <RequirementsMap role={role} />
      </section>
    </div>
  );
}
