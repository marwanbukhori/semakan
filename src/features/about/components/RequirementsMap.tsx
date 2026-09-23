import { Tag } from '@govtechmy/myds-react/tag';
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
import { useLocalized } from '../localized';
import { PROJECTS } from '../content/experience';
import {
  REQUIREMENTS,
  type Requirement,
  type RequirementId,
  type Role,
} from '../content/requirements';
import { blobUrl } from '../source/repo';

type RequirementsMapProps = { role: Role };

function pastWorkFor(id: RequirementId) {
  return PROJECTS.filter(
    (project) =>
      project.frontend?.requirements.includes(id) || project.backend?.requirements.includes(id),
  );
}

function semakanStatusLabel(
  t: ReturnType<typeof useTranslation>['t'],
  semakan: Requirement['semakan'],
) {
  return semakan.status === 'planned'
    ? t('about.experience.semakanStatus.planned', { plan: semakan.plan })
    : t(`about.experience.semakanStatus.${semakan.status}`);
}

const STATUS_VARIANT = { shown: 'success', partial: 'warning', planned: 'default' } as const;

/** A MYDS table, wrapped so it scrolls horizontally within its own container down to 360px. */
export function RequirementsMap({ role }: RequirementsMapProps) {
  const { t } = useTranslation();
  const pick = useLocalized();
  const rows = REQUIREMENTS.filter((requirement) => requirement.role === role);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>{t('about.experience.mapCaption', { role })}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('about.experience.col.requirement')}</TableHead>
            <TableHead>{t('about.experience.col.level')}</TableHead>
            <TableHead>{t('about.experience.col.past')}</TableHead>
            <TableHead>{t('about.experience.col.semakan')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((requirement) => (
            <TableRow key={requirement.id}>
              <TableCell>{pick(requirement.label)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {t(`about.experience.level.${requirement.level}`)}
              </TableCell>
              <TableCell>
                <ul className="flex flex-col gap-0.5">
                  {pastWorkFor(requirement.id).map((project) => (
                    <li key={project.id}>
                      <a
                        href={`#project-${project.id}`}
                        className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
                      >
                        {pick(project.name)}
                      </a>
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Tag
                    variant={STATUS_VARIANT[requirement.semakan.status]}
                    size="small"
                    mode="pill"
                    dot
                  >
                    {semakanStatusLabel(t, requirement.semakan)}
                  </Tag>
                  {requirement.semakan.links.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {requirement.semakan.links.map((link) => (
                        <li key={link.path}>
                          <a
                            href={blobUrl(link.path)}
                            className="text-body-sm font-medium text-txt-primary underline underline-offset-2"
                          >
                            {pick(link.label)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
