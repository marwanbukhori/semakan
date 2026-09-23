import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FuelFilters } from './FuelFilters';

describe('FuelFilters', () => {
  it('shows the active range and fuels as pressed toggles and reports changes', async () => {
    const onRangeChange = vi.fn();
    const onToggleFuel = vi.fn();
    const user = userEvent.setup();
    render(
      <FuelFilters
        range="6m"
        fuels={['ron95', 'diesel']}
        onRangeChange={onRangeChange}
        onToggleFuel={onToggleFuel}
      />,
    );

    const ranges = screen.getByRole('group', { name: 'Date range' });
    expect(screen.getByRole('button', { name: '6 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(ranges).toContainElement(screen.getByRole('button', { name: '1 year' }));
    expect(screen.getByRole('button', { name: 'RON97' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: '1 year' }));
    await user.click(screen.getByRole('button', { name: 'RON97' }));

    expect(onRangeChange).toHaveBeenCalledWith('1y');
    expect(onToggleFuel).toHaveBeenCalledWith('ron97');
  });
});
