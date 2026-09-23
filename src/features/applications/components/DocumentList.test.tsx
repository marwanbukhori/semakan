import { render, screen } from '@testing-library/react';
import { makeApplicationDetail } from '../fixtures';
import { DocumentList } from './DocumentList';

it('lists each document with its translated name, file name and size', () => {
  render(<DocumentList documents={makeApplicationDetail().documents} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('SSM certificate');
  expect(items[0]).toHaveTextContent('ssm_certificate.pdf');
  expect(items[0]).toHaveTextContent('320 KB');
});
