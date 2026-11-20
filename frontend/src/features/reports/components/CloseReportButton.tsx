import { useRef, useState } from 'react';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { Icon } from '../../../components/Icon';
import { describeCloseError } from '../../../services/reportApi';
import type { PetReport } from '../../../types/reports';
import { canCloseReport, useCloseReport } from '../hooks/useCloseReport';
import './CloseReportButton.css';

interface CloseReportButtonProps {
  report: PetReport;
  onClosed?: (report: PetReport) => void;
}

export function CloseReportButton({
  report,
  onClosed,
}: CloseReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate, isPending, error, reset } = useCloseReport();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!canCloseReport(report)) return null;

  const handleOpen = () => {
    reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
    reset();
    buttonRef.current?.focus();
  };

  const handleConfirm = () => {
    mutate(
      { id: report.petReportId },
      {
        onSuccess: (updated) => {
          setIsOpen(false);
          onClosed?.(updated);
        },
      },
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="close-report-button"
        aria-haspopup="dialog"
      >
        <Icon name="cancel" />
        Close Report
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Close Report"
        message="Confirm to close the report, this step cannot be undone."
        confirmText="Close report"
        cancelText="Cancel"
        confirmTone="danger"
        icon="cancel"
        isPending={isPending}
        error={error ? describeCloseError(error) : null}
        onConfirm={handleConfirm}
        onCancel={handleClose}
      />
    </>
  );
}
