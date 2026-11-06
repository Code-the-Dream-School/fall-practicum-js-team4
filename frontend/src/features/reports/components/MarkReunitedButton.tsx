import { useEffect, useRef, useState } from 'react';
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

// "Found my pet": asks to confirm, then closes the report as reunited
export function MarkReunitedButton({
  report,
  onReunited,
}: MarkReunitedButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useMarkReunited();
  const markRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const backToMark = useRef(false);

  // Each step replaces the button that had focus: move focus along with it
  // so keyboard and screen reader users don't land back at the page top
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    } else if (backToMark.current) {
      backToMark.current = false;
      markRef.current?.focus();
    }
  }, [confirming]);

  // The confirm button is disabled while saving, which drops its focus
  useEffect(() => {
    if (error) confirmRef.current?.focus();
  }, [error]);

  if (!canMarkReunited(report)) return null;

  if (!confirming) {
    return (
      <button
        ref={markRef}
        type="button"
        onClick={() => setConfirming(true)}
        className="reunited-button"
      >
        <Icon name="verified" />
        Mark Reunited
      </button>
    );
  }

  const cancel = () => {
    reset();
    backToMark.current = true;
    setConfirming(false);
  };
  const petName = report.petName || `your ${report.petType.toLowerCase()}`;

  return (
    <div role="group" aria-label="Confirm reunion" className="reunited-confirm">
      <p className="reunited-confirm__question">
        Is {petName} back home? The report will be marked as reunited.
      </p>
      <div className="reunited-confirm__actions">
        <button
          ref={confirmRef}
          type="button"
          onClick={() => mutate(report.petReportId, { onSuccess: onReunited })}
          disabled={isPending}
          className="reunited-button"
        >
          {isPending ? 'Saving…' : "Yes, we're reunited"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className="reunited-confirm__cancel"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="reunited-confirm__error">
          {describeReunitedError(error)}
        </p>
      )}
    </div>
  );
}
