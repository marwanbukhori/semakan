import { Button } from '@govtechmy/myds-react/button';
import { Tag } from '@govtechmy/myds-react/tag';
import { render, screen } from '@testing-library/react';

it('renders MYDS components in the test environment', () => {
  render(
    <>
      <Button variant="primary-fill">Simpan</Button>
      <Tag variant="success">Diluluskan</Tag>
    </>,
  );
  expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument();
  expect(screen.getByText('Diluluskan')).toBeInTheDocument();
});
