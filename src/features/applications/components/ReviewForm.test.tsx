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

  it('announces a form-level server error as an alert', async () => {
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Check this field and try again.');
  });

  it('still shows an alert when a 422 names no fields', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new ApiError({ kind: 'validation', status: 422, message: 'x', fieldErrors: {} }),
      ),
    );
    const { user } = renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check this field and try again.');
    expect(screen.getByRole('button', { name: 'Submit decision' })).toHaveFocus();
  });

  it('marks the decision radios invalid and focuses one after a server error on decision', async () => {
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
    await screen.findByText(
      'This premises type needs a fire safety certificate before it can be approved.',
    );

    const approve = screen.getByRole('radio', { name: 'Approve' });
    expect(approve).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Reject' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Request more information' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(approve).toHaveFocus();
  });

  it('marks the requested-info checkboxes invalid, describes the group, and focuses the first checkbox', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Request more information' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Note to the applicant' }),
      'Sila hantar pelan lantai.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    await screen.findByText('Choose at least one document.');

    const group = screen.getByRole('group', { name: 'Documents needed' });
    expect(group).toHaveAccessibleDescription('Choose at least one document.');
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    }
    expect(screen.getByRole('checkbox', { name: 'SSM certificate' })).toHaveFocus();
  });

  it('moves focus to the reason field when client-side validation fails', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Too short');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    await screen.findByText('Give a reason of at least 10 characters.');
    expect(screen.getByRole('textbox', { name: 'Reason for rejection' })).toHaveFocus();
  });

  it('clears the reason error on decision change but keeps the typed text', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reject' }));
    const reason = screen.getByRole('textbox', { name: 'Reason for rejection' });
    await user.type(reason, 'Too short');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    await screen.findByText('Give a reason of at least 10 characters.');

    await user.click(screen.getByRole('radio', { name: 'Approve' }));
    await user.click(screen.getByRole('radio', { name: 'Reject' }));

    expect(screen.queryByText('Give a reason of at least 10 characters.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue('Too short');
  });
});
