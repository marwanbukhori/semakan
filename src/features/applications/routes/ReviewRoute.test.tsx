import { AutoToast } from '@govtechmy/myds-react/toast';
import { screen, waitFor, within } from '@testing-library/react';
import { Outlet } from 'react-router';
import { isReviewable } from '@/features/applications/rules';
import { requiresFireCertificate, seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { renderRoutes } from '@/test/render';
import { Component as DetailRoute } from './DetailRoute';
import { Component as ReviewRoute } from './ReviewRoute';

const details = seedApplicationDetails();
const hasFire = (d: (typeof details)[number]) =>
  d.documents.some((doc) => doc.kind === 'fire_certificate');
const approvable = details.find(
  (d) => isReviewable(d.status) && (!requiresFireCertificate(d.premisesCategory) || hasFire(d)),
)!;
const blocked = details.find(
  (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
)!;
const closed = details.find((d) => d.status === 'approved')!;

function Shell() {
  return (
    <>
      <Outlet />
      <AutoToast />
    </>
  );
}

const renderReview = (id: string) =>
  renderRoutes(
    [
      {
        Component: Shell,
        children: [
          {
            path: '/applications/:id',
            Component: DetailRoute,
            children: [{ path: 'review', Component: ReviewRoute }],
          },
        ],
      },
    ],
    { initialEntries: [`/applications/${id}/review`] },
  );

// While the dialog is open, the detail page behind it is inert: still in the
// DOM (its data keeps updating underneath), but `aria-hidden` by Radix's
// modal focus management, so role queries must opt in with `hidden: true` to
// reach it. Pass that option for any query made while the dialog is open;
// once it has closed the background is reachable normally again.
const heading = (d: { referenceNo: string }, options?: { hidden?: boolean }) =>
  screen.findByRole('heading', { level: 1, name: d.referenceNo, ...options });

describe('/applications/:id/review', () => {
  it('opens as a named dialog with focus inside, and Escape returns to the detail page', async () => {
    const { user, router } = renderReview(approvable.id);

    const dialog = await screen.findByRole('dialog', { name: `Review ${approvable.referenceNo}` });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // The background is inaccessible by role while the dialog is open — a
    // modal dialog's whole point.
    expect(
      screen.queryByRole('heading', { level: 1, name: approvable.referenceNo }),
    ).not.toBeInTheDocument();
    // It's still in the DOM, just marked inert, not removed.
    expect(
      screen.getByRole('heading', { level: 1, name: approvable.referenceNo, hidden: true }),
    ).toBeInTheDocument();

    // Tabbing away from the last focusable control keeps focus trapped inside.
    within(dialog).getByRole('button', { name: 'Submit decision' }).focus();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(`/applications/${approvable.id}`);
  });

  it('records an approval, confirms it and closes', async () => {
    const { user, router } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Application approved')).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/applications/${approvable.id}`),
    );
    expect(
      await screen.findByText('A decision has been recorded. This application is closed.'),
    ).toBeInTheDocument();
  });

  it('updates the status optimistically while the request is in flight', async () => {
    const { user } = renderReview(approvable.id);
    await heading(approvable, { hidden: true });
    const dialog = await screen.findByRole('dialog');
    setDevControls({ latencyMs: 800 });

    await user.click(within(dialog).getByRole('radio', { name: 'Reject' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Reason for rejection' }),
      'Premis di zon kediaman',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(within(dialog).getByRole('button', { name: 'Submitting…' })).toBeDisabled();
    const header = (await heading(approvable, { hidden: true })).parentElement!;
    expect(within(header).getByText('Rejected')).toBeInTheDocument();
  });

  it('rolls back and explains when the server fails', async () => {
    const { user } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');
    setDevControls({ failure: 'server' });

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Your decision was not saved')).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent("Couldn't submit your decision");
    const header = (await heading(approvable, { hidden: true })).parentElement!;
    expect(within(header).queryByText('Approved')).not.toBeInTheDocument();
  });

  it('shows the fire-certificate rule the server enforced', async () => {
    const { user } = renderReview(blocked.id);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(
      await within(dialog).findByText(
        'This premises type needs a fire safety certificate before it can be approved.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps what the officer typed after a conflict, and lets them submit again', async () => {
    const { user } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');
    setDevControls({ conflictNext: true });

    await user.click(within(dialog).getByRole('radio', { name: 'Reject' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Reason for rejection' }),
      'Premis di zon kediaman',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(
      await within(dialog).findByText('Another officer updated this application'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue(
      'Premis di zon kediaman',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));
    expect(await screen.findByText('Application rejected')).toBeInTheDocument();
  });

  it('redirects a review link for a closed application to its detail page', async () => {
    const { router } = renderReview(closed.id);
    await heading(closed);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/applications/${closed.id}`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
