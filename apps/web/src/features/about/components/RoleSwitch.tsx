import { Radio, RadioButton, RadioItem, RadioLabel } from '@govtechmy/myds-react/radio';
import { useTranslation } from 'react-i18next';
import type { Role } from '../content/requirements';

// Backend first: the author's current focus (CONTROLLER RULING P5-R6).
const ROLES = ['backend', 'frontend'] as const satisfies readonly Role[];

type RoleSwitchProps = { role: Role; onRoleChange: (role: Role) => void };

/** A radio group, not a toggle: both roles stay visible and labelled, and arrow keys switch between them. */
export function RoleSwitch({ role, onRoleChange }: RoleSwitchProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id="role-switch-legend" className="mb-1 text-body-sm font-medium">
        {t('about.experience.roleLegend')}
      </legend>
      <Radio
        value={role}
        onValueChange={(value) => onRoleChange(value as Role)}
        name="role"
        aria-labelledby="role-switch-legend"
      >
        {ROLES.map((value) => (
          <RadioItem key={value}>
            <RadioButton id={`role-${value}`} value={value} />
            <RadioLabel htmlFor={`role-${value}`}>
              {t(`about.experience.roles.${value}`)}
            </RadioLabel>
          </RadioItem>
        ))}
      </Radio>
    </fieldset>
  );
}
