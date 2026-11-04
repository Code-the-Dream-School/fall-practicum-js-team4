import { useState } from 'react';
import { Icon } from '../../../components/Icon';
import { describeApiError } from '../../../services/describeApiError';
import { buttonStyles, colors } from '../../../styles/theme';
import type { PetReport } from '../../../types/reports';
import { canMarkReunited, useMarkReunited } from '../hooks/useMarkReunited';
import './MarkReunitedButton.css';

interface MarkReunitedButtonProps {
  // A report of the signed-in user (the API refuses anyone else's)
  report: PetReport;
  // Called once the report is saved as reunited
  onReunited?: (report: PetReport) => void;
}

// "Found my pet": asks to confirm, then closes the report as reunited
export function MarkReunitedButton({
  report,
  onReunited,
}: MarkReunitedButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { mutate, isPending, error, reset } = useMarkReunited();

  if (!canMarkReunited(report)) return null;

  if (!confirming) {
    return (
      <button
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
    setConfirming(false);
  };
  const petName = report.petName || `your ${report.petType.toLowerCase()}`;

  return (
    <div
      role="group"
      aria-label="Confirm reunion"
      style={{ display: 'grid', gap: 8 }}
    >
      <p style={{ margin: 0 }}>
        Is {petName} back home? The report will be marked as reunited.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
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
          style={buttonStyles.outline}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p
          role="alert"
          style={{ margin: 0, color: colors.danger, fontSize: 14 }}
        >
          {describeApiError(error).title}. The report wasn't changed.
        </p>
      )}
    </div>
  );
}
