import { screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { renderRoutes } from '@/test/render';
import { makeApplicationSummary } from '../fixtures';
import { ApplicationTable } from './ApplicationTable';

type Props = ComponentProps<typeof ApplicationTable>;

function renderTable(overrides: Partial<Props> = {}) {
  const props: Props = {
    items: undefined,
    isLoading: false,
    sort: 'submittedAt',
    order: 'desc',
    onSortChange: vi.fn(),
    emptyState: <p>Nothing here</p>,
    ...overrides,
  };
  return { ...renderRoutes([{ path: '/', element: <ApplicationTable {...props} /> }]), props };
}

describe('ApplicationTable', () => {
  it('announces loading and shows skeleton rows', () => {
    renderTable({ isLoading: true });
    const table = screen.getByRole('table', { name: 'Loading applications…' });
    expect(within(table).queryAllByRole('link')).toHaveLength(0);
  });

  it('renders one row per application with a link, category and status', () => {
    renderTable({
      items: [
        makeApplicationSummary(),
        makeApplicationSummary({
          id: 'app-002',
          referenceNo: 'LPP-2026-1001',
          status: 'rejected',
          premisesCategory: 'workshop',
          submittedAt: '2026-09-21T09:00:00.000Z',
        }),
      ],
    });

    const table = screen.getByRole('table', { name: 'Licence applications' });
    expect(within(table).getByRole('link', { name: 'LPP-2026-1000' })).toHaveAttribute(
      'href',
      '/applications/app-001',
    );
    expect(within(table).getByText('Approved')).toBeInTheDocument();
    expect(within(table).getByText('Rejected')).toBeInTheDocument();
    expect(within(table).getByText('Workshop')).toBeInTheDocument();
    expect(within(table).getByText('20 Sep', { exact: false })).toBeInTheDocument();
  });

  it('shows the empty state when there are no items', () => {
    renderTable({ items: [] });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('marks the active sort column for assistive technology', () => {
    renderTable({ items: [], sort: 'submittedAt', order: 'desc' });
    expect(screen.getByRole('columnheader', { name: 'Submitted' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getByRole('columnheader', { name: 'Business' })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('sorts a new column ascending and flips the active column', async () => {
    const { user, props } = renderTable({ items: [], sort: 'submittedAt', order: 'desc' });

    await user.click(screen.getByRole('button', { name: 'Business' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith('businessName', 'asc');

    await user.click(screen.getByRole('button', { name: 'Submitted' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith('submittedAt', 'asc');
  });

  it('keeps data cells and sortable header buttons on one line', () => {
    renderTable({ items: [makeApplicationSummary()] });

    const link = screen.getByRole('link', { name: 'LPP-2026-1000' });
    expect(link.closest('td')).toHaveClass('whitespace-nowrap');
    expect(screen.getByRole('button', { name: 'Business' })).toHaveClass('whitespace-nowrap');
  });

  it('sizes skeleton rows to match a data row so nothing shifts when loading finishes', () => {
    const { container } = renderTable({ isLoading: true });

    const skeletonCell = container.querySelector('td');
    expect(skeletonCell?.firstElementChild).toHaveClass('h-[33.11px]');
  });
});
