import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/shared/api/ApiError';
import { ReviewForm } from './ReviewForm';

function renderForm(onSubmit = vi.fn(() => Promise.resolve())) {
  const user = userEvent.setup();
  render(<ReviewForm isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { user, onSubmit };
}

describe('ReviewForm', () => {
  it('approves by default with an optional note', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ decision: 'approve', note: '' }));
  });

  it('asks for a reason when rejecting and links the error to the field', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Too short');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    const reason = screen.getByRole('textbox', { name: 'Reason for rejection' });
    expect(await screen.findByText('Give a reason of at least 10 characters.')).toBeInTheDocument();
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription('Give a reason of at least 10 characters.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks which documents are needed when requesting information', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Request more information' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Note to the applicant' }),
      'Sila hantar pelan lantai.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(await screen.findByText('Choose at least one document.')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Floor plan' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        decision: 'request_info',
        requestedInfo: ['floor_plan'],
        note: 'Sila hantar pelan lantai.',
      }),
    );
  });

  it('shows a rule the server enforced (422) on the decision field', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new ApiError({
          kind: 'validation',
          status: 422,
          message: 'Review rejected',
          fieldErrors: { decision: ['missing_fire_certificate'] },
        }),
      ),
    );
    const { user } = renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(
      await screen.findByText(
        'This premises type needs a fire safety certificate before it can be approved.',
      ),
    ).toBeInTheDocument();
  });

  it('falls back to a general message for server codes or fields it does not know', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new ApiError({
          kind: 'validation',
          status: 422,
          message: 'x',
          fieldErrors: { version: ['stale'] },
        }),
      ),
    );
    const { user } = renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Check this field and try again.')).toBeInTheDocument();
  });
});
