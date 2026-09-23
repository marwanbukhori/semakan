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

  it('never lets the Status Select warn about switching controlled state', async () => {
    // Regression test: MYDS's Select syncs Radix's internal `open` state from its own `open`
    // prop via a bare `useEffect`, with no guard against `undefined`. Omitting `open` used to
    // flip it from a defined boolean to `undefined` after mount, which Radix's dev-mode
    // useControllableState reports via console.warn/error as "changing from controlled to
    // uncontrolled". We now control `open` ourselves, so it should never fire.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationFilters q="" status="all" onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Approved' }));

    const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls].flat().map(String);
    expect(messages.some((message) => message.includes('controlled'))).toBe(false);
  });

  it('adopts a search value changed elsewhere, e.g. by "Clear filters"', () => {
    const { rerender } = render(<ApplicationFilters q="kedai" status="all" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('kedai');

    rerender(<ApplicationFilters q="" status="all" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  });
});
