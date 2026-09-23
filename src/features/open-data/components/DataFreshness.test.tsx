import { render, screen } from '@testing-library/react';
import { DataFreshness } from './DataFreshness';

it('credits the source and says how fresh the data is', () => {
  render(
    <DataFreshness
      meta={{
        catalogue_id: 'fuelprice',
        data_as_of: '2026-09-23T16:01:00.000Z',
        last_updated: '2026-09-23T15:59:00.000Z',
        next_update: '2026-09-30T15:59:00.000Z',
        data_source: ['MOF'],
        update_frequency: 'WEEKLY',
      }}
    />,
  );

  expect(screen.getByText(/Data as of 24 Sep/)).toBeInTheDocument();
  expect(screen.getByText(/Next update 30 Sep/)).toBeInTheDocument();
  expect(screen.getByText('Source: MOF via data.gov.my')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View this dataset on data.gov.my' })).toHaveAttribute(
    'href',
    'https://data.gov.my/data-catalogue/fuelprice',
  );
});
