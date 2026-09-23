import { Tag } from '@govtechmy/myds-react/tag';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLocalized } from '../localized';
import type { Facet, Project } from '../content/experience';
import { REQUIREMENTS, type Role } from '../content/requirements';

const OTHER_ROLE: Record<Role, Role> = { frontend: 'backend', backend: 'frontend' };
/** Every id in a facet's `requirements` comes from `REQUIREMENTS` (typed via `RequirementId`), so a lookup here always finds an entry. */
const REQUIREMENT_LABEL = new Map(
  REQUIREMENTS.map((requirement) => [requirement.id, requirement.label]),
);

type ProjectCardProps = { project: Project; role: Role };

/**
 * Each project can have a frontend facet, a backend facet, or both. The active role's facet comes
 * first; a project missing that facet is dimmed by its container (dashed border, `bg-bg-washed`,
 * never opacity) but any facet it does have for the other role stays fully readable.
 */
export function ProjectCard({ project, role }: ProjectCardProps) {
  const { t } = useTranslation();
  const pick = useLocalized();
  const otherRole = OTHER_ROLE[role];
  const activeFacet = project[role];
  const otherFacet = project[otherRole];
  const hasActiveFacet = activeFacet !== undefined;

  const sections: { role: Role; facet: Facet }[] = [
    ...(activeFacet ? [{ role, facet: activeFacet }] : []),
    ...(otherFacet ? [{ role: otherRole, facet: otherFacet }] : []),
  ];

  const headingId = `project-${project.id}-heading`;

  return (
    <article
      id={`project-${project.id}`}
      aria-labelledby={headingId}
      className={`flex flex-col gap-4 rounded-md border p-4 ${
        hasActiveFacet ? 'border-otl-divider' : 'border-dashed border-otl-divider bg-bg-washed'
      }`}
    >
      <header className="flex flex-col gap-1">
        <h3 id={headingId} className="font-heading text-body-lg font-semibold">
          {pick(project.name)}
        </h3>
        <p className="text-body-sm text-txt-black-500">
          {pick(project.org)} · {project.period}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {project.stack.map((technology) => (
            <li key={technology} className="text-body-xs text-txt-black-500">
              <code>{technology}</code>
            </li>
          ))}
        </ul>
      </header>

      {!hasActiveFacet && (
        <p className="text-body-sm text-txt-black-700">{t('about.experience.noFacet', { role })}</p>
      )}

      {sections.map(({ role: facetRole, facet }) => (
        <FacetSection key={facetRole} role={facetRole} facet={facet} />
      ))}
    </article>
  );
}

function FacetSection({ role, facet }: { role: Role; facet: Facet }) {
  const { t } = useTranslation();
  const pick = useLocalized();
  const built = pick(facet.built);
  const challenge = facet.challenge ? pick(facet.challenge) : undefined;

  return (
    <section className="flex flex-col gap-2">
      <h4 className="font-heading text-body-md font-semibold">
        {t(`about.experience.facet.${role}`)}
      </h4>

      <div>
        <p className="text-body-xs font-semibold text-txt-black-500">
          {t('about.experience.built')}
        </p>
        <ul className="list-disc pl-5">
          {built.map((item) => (
            <li key={item} className="text-body-sm text-txt-black-700">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {challenge && (
        <div>
          <p className="text-body-xs font-semibold text-txt-black-500">
            {t('about.experience.challenge')}
          </p>
          <p className="text-body-sm text-txt-black-700">{challenge}</p>
        </div>
      )}

      {facet.semakan && facet.semakan.length > 0 && (
        <div>
          <p className="text-body-xs font-semibold text-txt-black-500">
            {t('about.experience.inSemakan')}
          </p>
          <ul className="flex flex-col gap-0.5">
            {facet.semakan.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
                >
                  {pick(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-body-xs font-semibold text-txt-black-500">
          {t('about.experience.requirements')}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {facet.requirements.map((id) => (
            <li key={id}>
              <Tag variant="default" size="small">
                {pick(REQUIREMENT_LABEL.get(id)!)}
              </Tag>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
