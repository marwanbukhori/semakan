import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { useRole } from './useRole';

function Probe() {
  const { role, setRole } = useRole();
  return (
    <>
      <output aria-label="role">{role}</output>
      <button onClick={() => setRole('frontend')}>frontend</button>
      <button onClick={() => setRole('backend')}>backend</button>
    </>
  );
}

const renderProbe = (url = '/') =>
  renderRoutes([{ path: '/', Component: Probe }], { initialEntries: [url] });
const roleText = () => screen.getByRole('status', { name: 'role' }).textContent;

describe('useRole', () => {
  it('defaults to backend, with a clean URL', () => {
    const { router } = renderProbe();
    expect(roleText()).toBe('backend');
    expect(router.state.location.search).toBe('');
  });

  it('writes frontend to the URL when chosen', async () => {
    const { user, router } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'frontend' }));
    expect(roleText()).toBe('frontend');
    expect(router.state.location.search).toBe('?role=frontend');
  });

  it('falls back to backend for a tampered value', () => {
    renderProbe('/?role=nonsense');
    expect(roleText()).toBe('backend');
  });

  it('removes the param when set back to the default (backend)', async () => {
    const { user, router } = renderProbe('/?role=frontend');
    await user.click(screen.getByRole('button', { name: 'backend' }));
    expect(router.state.location.search).toBe('');
  });
});
