import { render, screen, within } from '@testing-library/react';
import { makeApplicationDetail } from '../fixtures';
import { ApplicationFacts } from './ApplicationFacts';

describe('ApplicationFacts', () => {
  it('lists applicant and business facts as labelled rows', () => {
    render(<ApplicationFacts application={makeApplicationDetail({ assignedOfficerName: null })} />);

    const applicant = screen.getByRole('region', { name: 'Applicant' });
    expect(within(applicant).getByRole('rowheader', { name: 'IC number' })).toBeInTheDocument();
    expect(within(applicant).getByText('850412-10-5523')).toBeInTheDocument();

    const business = screen.getByRole('region', { name: 'Business' });
    expect(within(business).getByText('Retail')).toBeInTheDocument();
    expect(within(business).getByText('Unassigned')).toBeInTheDocument();
  });
});
