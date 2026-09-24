import { render, screen } from '@testing-library/react';
import { StatusBadge, statusVariant } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['submitted', 'default'],
    ['under_review', 'primary'],
    ['info_requested', 'warning'],
    ['approved', 'success'],
    ['rejected', 'danger'],
  ] as const)('maps %s to the %s MYDS variant', (status, variant) => {
    expect(statusVariant(status)).toBe(variant);
  });

  it('shows the translated status label', () => {
    render(<StatusBadge status="info_requested" />);
    expect(screen.getByText('Info requested')).toBeInTheDocument();
  });
});
