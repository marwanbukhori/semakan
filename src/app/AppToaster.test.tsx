import { useToast } from '@govtechmy/myds-react/hooks';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { i18n } from '@/shared/i18n';
import { AppToaster } from './AppToaster';

function Trigger() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => toast({ variant: 'success', title: 'Saved', description: 'All done.' })}
    >
      Notify
    </button>
  );
}

const renderToaster = () => {
  const user = userEvent.setup();
  render(
    <>
      <Trigger />
      <AppToaster />
    </>,
  );
  return { user };
};

describe('AppToaster', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it('shows a toast sent with useToast().toast, with a named close button', async () => {
    const { user } = renderToaster();

    await user.click(screen.getByRole('button', { name: 'Notify' }));

    const title = await screen.findByText('Saved');
    const toast = title.closest('li')!;
    expect(toast).toHaveTextContent('All done.');

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });

  it('labels the notification region in the current language', async () => {
    renderToaster();
    expect(screen.getByRole('region', { name: 'Notifications (F8)' })).toBeInTheDocument();

    await act(() => i18n.changeLanguage('ms'));

    expect(screen.getByRole('region', { name: 'Pemberitahuan (F8)' })).toBeInTheDocument();
  });

  it('announces the toast with a translated prefix', async () => {
    await act(() => i18n.changeLanguage('ms'));
    const { user } = renderToaster();

    await user.click(screen.getByRole('button', { name: 'Notify' }));

    // Radix announces "<label> <title> <description>" in a hidden live region.
    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent(/^Pemberitahuan Saved/));
  });
});
