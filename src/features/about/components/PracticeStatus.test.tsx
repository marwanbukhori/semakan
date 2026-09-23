import { render, screen } from '@testing-library/react';
import { PracticeStatus } from './PracticeStatus';

describe('PracticeStatus', () => {
  it('shows "Enforced" in words for an enforced practice', () => {
    render(<PracticeStatus status="enforced" />);
    expect(screen.getByText('Enforced')).toBeInTheDocument();
  });

  it('shows "Partial" and the plan number for a partial practice with a plan', () => {
    render(<PracticeStatus status="partial" plan={4} />);
    expect(screen.getByText(/Partial/)).toBeInTheDocument();
    expect(screen.getByText(/Plan 4/)).toBeInTheDocument();
  });

  it('shows "Planned" for a planned practice', () => {
    render(<PracticeStatus status="planned" />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });
});
