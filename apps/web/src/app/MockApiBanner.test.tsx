import { render, screen } from '@testing-library/react';
import { MockApiBanner } from './MockApiBanner';

describe('MockApiBanner', () => {
  it('explains that the demo data cannot load', () => {
    render(<MockApiBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent("The demo's mock API could not start");
  });
});
