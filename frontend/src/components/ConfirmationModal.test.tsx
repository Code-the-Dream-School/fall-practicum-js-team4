import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        title="Confirm action"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with accessible labels, title, message and buttons when open', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        confirmText="Close report"
        cancelText="Cancel"
        confirmTone="danger"
        icon="cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute(
      'aria-labelledby',
      'confirmation-modal-title',
    );
    expect(dialog).toHaveAttribute(
      'aria-describedby',
      'confirmation-modal-description',
    );

    expect(
      screen.getByRole('heading', { name: /close report/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Confirm to close the report, this step cannot be undone.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close report' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Mark Reunited"
        message="Confirm to mark the report as reunited, this step cannot be undone."
        confirmText="Yes, we're reunited"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when pressing Escape key', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows saving state and disables buttons while isPending', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        confirmText="Close report"
        isPending={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('displays error message in an alert when error is provided', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        error="Something went wrong. The report wasn't closed."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      "Something went wrong. The report wasn't closed.",
    );
  });
});
