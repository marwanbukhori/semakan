import { render, screen, within } from '@testing-library/react';
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

  it('is keyboard operable: toggle, then the controls, and Escape closes back to the toggle', async () => {
    const { user } = renderPanel();
    const toggle = screen.getByRole('button', { name: 'Dev Panel' });

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.tab();
    const latency = screen.getByRole('group', { name: 'Latency' });
    expect(within(latency).getByRole('radio', { name: 'None' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Mock API controls' })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('marks the toggle as active while any setting differs from the defaults', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Dev Panel' }));

    await user.click(screen.getByRole('radio', { name: 'Network failure' }));
    const toggle = screen.getByRole('button', { name: 'Dev Panel (settings active)' });
    expect(toggle).toHaveTextContent('Active');

    await user.click(screen.getByRole('radio', { name: 'None', checked: false }));
    expect(screen.getByRole('button', { name: 'Dev Panel' })).not.toHaveTextContent('Active');
  });

  it('forces a conflict on the next review', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Dev Panel' }));

    await user.click(screen.getByRole('checkbox', { name: 'Force a conflict on the next review' }));

    expect(getDevControls().conflictNext).toBe(true);
  });

  it('switches the data.gov.my source', async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole('button', { name: /Dev Panel/ }));

    await user.click(screen.getByRole('radio', { name: 'Rate limited (429)' }));

    expect(getDevControls().dataGov).toBe('rate_limited');
  });

  it('ignores Escape pressed outside the panel', async () => {
    const { Wrapper } = createWrapper();
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Elsewhere</button>
        <DevPanel />
      </>,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('button', { name: 'Dev Panel' }));
    screen.getByRole('button', { name: 'Elsewhere' }).focus();

    await user.keyboard('{Escape}');

    expect(screen.getByRole('region', { name: 'Mock API controls' })).toBeInTheDocument();
  });
});
