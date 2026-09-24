import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { Role } from '../content/requirements';

const DEFAULT_ROLE: Role = 'backend';

function parseRole(value: string | null): Role {
  return value === 'frontend' ? 'frontend' : DEFAULT_ROLE;
}

/** The role lives in `?role=`, so a view can be shared; the default (backend) is kept out of the URL. */
export function useRole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = parseRole(searchParams.get('role'));

  const setRole = useCallback(
    (next: Role) => {
      const params = new URLSearchParams(searchParams);
      if (next === DEFAULT_ROLE) {
        params.delete('role');
      } else {
        params.set('role', next);
      }
      // replace: switching roles should not fill the Back history.
      void setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return { role, setRole };
}
