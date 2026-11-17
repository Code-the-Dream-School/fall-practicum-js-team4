import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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
    const heading = screen.getByRole('heading', { name: /close report/i });
    const description = screen.getByText(
      'Confirm to close the report, this step cannot be undone.',
    );

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    expect(dialog).toHaveAttribute('aria-describedby', description.id);

    expect(heading).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close report' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('starts focus on Cancel for danger tone', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        confirmText="Close report"
        cancelText="Cancel"
        confirmTone="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('starts focus on Confirm for success or primary tone', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Mark Reunited"
        message="Confirm to mark reunited."
        confirmText="Yes, we're reunited"
        confirmTone="success"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    ).toHaveFocus();
  });

  it('does not reset focus when parent re-renders while open', async () => {
    function ParentComponent() {
      const [, setCount] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            Trigger Parent Re-render
          </button>
          <ConfirmationModal
            isOpen={true}
            title="Mark Reunited"
            message="Confirm reunion"
            confirmText="Confirm"
            cancelText="Cancel"
            confirmTone="primary"
            onConfirm={vi.fn()}
            // New inline function on every render:
            onCancel={() => {}}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    render(<ParentComponent />);

    // Initially focused on Confirm
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    // User tabs to Cancel
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    // Trigger parent re-render (simulating toast dismiss or refetch)
    await user.click(
      screen.getByRole('button', { name: 'Trigger Parent Re-render' }),
    );

    // Focus must NOT jump back to Confirm!
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveFocus();
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
