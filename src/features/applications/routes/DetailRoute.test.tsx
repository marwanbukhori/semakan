import { screen, within } from '@testing-library/react';
import { isReviewable } from '@/features/applications/rules';
import { seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { renderRoutes } from '@/test/render';
import { Component as DetailRoute } from './DetailRoute';

const details = seedApplicationDetails();
const open = details.find((d) => isReviewable(d.status))!;
const closed = details.find((d) => d.status === 'approved')!;

const renderDetail = (id: string) =>
  renderRoutes([{ path: '/applications/:id', Component: DetailRoute }], {
    initialEntries: [`/applications/${id}`],
  });

describe('/applications/:id', () => {
  it('shows the application with its facts, documents and timeline', async () => {
    renderDetail(open.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: open.referenceNo }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Applicant' })).toHaveTextContent(
      open.applicantIdNumber,
    );
    expect(screen.getByRole('region', { name: 'Documents' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Timeline' })).getAllByRole('listitem'),
    ).toHaveLength(open.timeline.length);
  });

  it('links back to the list from a translated breadcrumb', async () => {
    renderDetail(open.id);
    const crumbs = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/applications',
    );
  });

  it('offers review only while the application is open', async () => {
    const { unmount } = renderDetail(open.id);
    expect(await screen.findByRole('link', { name: 'Review application' })).toHaveAttribute(
      'href',
      `/applications/${open.id}/review`,
    );
    unmount();

    renderDetail(closed.id);
    expect(
      await screen.findByText('A decision has been recorded. This application is closed.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review application' })).not.toBeInTheDocument();
  });

  it('explains an unknown reference', async () => {
    renderDetail('app-999');
    expect(
      await screen.findByRole('heading', { name: 'Application not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to applications' })).toHaveAttribute(
      'href',
      '/applications',
    );
  });

  it('shows a retryable error when loading fails', async () => {
    setDevControls({ failure: 'server' });
    const { user } = renderDetail(open.id);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this application");
    setDevControls({ failure: 'none' });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: open.referenceNo }),
    ).toBeInTheDocument();
  });
});
