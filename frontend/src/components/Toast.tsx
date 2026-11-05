import { useEffect } from 'react';
import { Icon } from './Icon';
import './Toast.css';

// How long a toast stays on screen
export const TOAST_DURATION_MS = 3500;

interface ToastProps {
  // Nothing shows while null
  message: string | null;
  onDismiss: () => void;
}

// Short success message in the top-right corner that hides itself.
// The live region is always rendered so screen readers announce new messages.
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <div role="status" aria-live="polite" className="toast-region">
      {message && (
        <div className="toast">
          <Icon name="check_circle" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
