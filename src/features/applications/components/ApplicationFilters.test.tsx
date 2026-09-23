import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationFilters } from './ApplicationFilters';

describe('ApplicationFilters', () => {
  it('debounces search input into a single change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationFilters q="" status="all" onChange={onChange} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'kedai');

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ q: 'kedai' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('changes the status filter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationFilters q="" status="all" onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Approved' }));

    expect(onChange).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('adopts a search value changed elsewhere, e.g. by "Clear filters"', () => {
    const { rerender } = render(<ApplicationFilters q="kedai" status="all" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('kedai');

    rerender(<ApplicationFilters q="" status="all" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  });
});
