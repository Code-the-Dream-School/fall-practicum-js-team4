import { useRef, useState } from 'react';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { Icon } from '../../../components/Icon';
import { describeReunitedError } from '../../../services/reportApi';
import type { PetReport } from '../../../types/reports';
import { canMarkReunited, useMarkReunited } from '../hooks/useMarkReunited';
import './MarkReunitedButton.css';

interface MarkReunitedButtonProps {
  // A report of the signed-in user (the API refuses anyone else's)
  report: PetReport;
  // Called once the report is saved as reunited. This button disappears
  // then, so the caller must move keyboard focus somewhere sensible.
  onReunited?: (report: PetReport) => void;
}

// "Found my pet": asks to confirm in a modal, then closes the report as reunited
export function MarkReunitedButton({
  report,
  onReunited,
}: MarkReunitedButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate, isPending, error, reset } = useMarkReunited();
  const markRef = useRef<HTMLButtonElement>(null);

  if (!canMarkReunited(report)) return null;

  const handleOpen = () => {
    reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
    reset();
    markRef.current?.focus();
  };

  const handleConfirm = () => {
    mutate(report.petReportId, {
      onSuccess: (updated) => {
        setIsOpen(false);
        onReunited?.(updated);
      },
    });
  };

  return (
    <>
      <button
        ref={markRef}
        type="button"
        onClick={handleOpen}
        className="reunited-button"
        aria-haspopup="dialog"
      >
        <Icon name="verified" />
        Mark Reunited
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Mark Reunited"
        message="Confirm to mark the report as reunited, this step cannot be undone."
        confirmText="Yes, we're reunited"
        cancelText="Cancel"
        confirmTone="success"
        icon="verified"
        isPending={isPending}
        error={error ? describeReunitedError(error) : null}
        onConfirm={handleConfirm}
        onCancel={handleClose}
      />
    </>
  );
}
