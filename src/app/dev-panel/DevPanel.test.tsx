import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { DevPanel } from './DevPanel';

function renderPanel() {
  const { Wrapper, queryClient } = createWrapper();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const user = userEvent.setup();
  render(<DevPanel />, { wrapper: Wrapper });
  return { user, invalidate };
}

describe('DevPanel', () => {
  it('stays collapsed until opened', async () => {
    const { user } = renderPanel();
    const toggle = screen.getByRole('button', { name: 'Dev Panel' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Mock API controls' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Mock API controls' })).toBeInTheDocument();
  });

  it('forces a server error and refetches what is on screen', async () => {
    const { user, invalidate } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Dev Panel' }));

    await user.click(screen.getByRole('radio', { name: 'Server error (500)' }));

    expect(getDevControls().failure).toBe('server');
    expect(invalidate).toHaveBeenCalled();
  });

  it('sets latency and the empty-list switch', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Dev Panel' }));

    await user.click(screen.getByRole('radio', { name: '2000 ms' }));
    await user.click(screen.getByRole('checkbox', { name: 'Return an empty list' }));

    expect(getDevControls()).toMatchObject({ latencyMs: 2000, emptyList: true });
  });
});
