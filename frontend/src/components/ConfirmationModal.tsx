import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './ConfirmationModal.css';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: 'success' | 'danger' | 'primary';
  icon?: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmTone = 'primary',
  icon,
  isPending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Keep latest callbacks in refs so the keydown listener doesn't need to re-bind
  // or re-trigger effects on parent re-renders.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;

  // Set initial focus only when the modal opens.
  // For destructive/danger actions, start on Cancel to prevent accidental confirms.
  useEffect(() => {
    if (!isOpen) return;
    if (confirmTone === 'danger') {
      cancelRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [isOpen, confirmTone]);

  // Restore focus if a save fails and buttons are re-enabled
  useEffect(() => {
    if (error) {
      if (confirmTone === 'danger') {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }
  }, [error, confirmTone]);

  // Handle body scroll lock and key listeners (Escape & focus trap)
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isPendingRef.current) onCancelRef.current();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Focus trap
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          // Both buttons disabled while saving: keep focus on dialog container
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="confirmation-modal-overlay">
      <div
        className="confirmation-modal-backdrop"
        onClick={() => !isPendingRef.current && onCancelRef.current()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="confirmation-modal"
      >
        <div className="confirmation-modal__header">
          {icon && (
            <span
              className={`confirmation-modal__icon confirmation-modal__icon--${confirmTone}`}
              aria-hidden="true"
            >
              <Icon name={icon} />
            </span>
          )}
          <h2 id={titleId} className="confirmation-modal__title">
            {title}
          </h2>
        </div>

        <p id={descriptionId} className="confirmation-modal__message">
          {message}
        </p>

        {error && (
          <p role="alert" className="confirmation-modal__error">
            {error}
          </p>
        )}

        <div className="confirmation-modal__actions">
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`confirmation-modal__btn confirmation-modal__btn--${confirmTone}`}
          >
            {isPending ? 'Saving…' : confirmText}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="confirmation-modal__btn confirmation-modal__btn--cancel"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
