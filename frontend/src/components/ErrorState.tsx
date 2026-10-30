import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { describeApiError } from '../services/describeApiError';
import type { ErrorKind } from '../services/describeApiError';
import { buttonStyles, colors, layout } from '../styles/theme';

// page: the page's main data failed and nothing is on screen
// inline: one card or section failed; the rest of the page keeps working
// banner: data is already on screen, but refreshing it failed
export type ErrorStateVariant = 'page' | 'inline' | 'banner';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  variant?: ErrorStateVariant;
}

const ICONS: Record<ErrorKind, string> = {
  network: 'wifi_off',
  unauthenticated: 'schedule',
  forbidden: 'lock',
  'not-found': 'search_off',
  'rate-limited': 'hourglass_top',
  server: 'cloud_off',
  client: 'error',
  unknown: 'error',
};

const linkButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: 0,
  border: 0,
  background: 'none',
  color: colors.found,
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
};

// Shows an API failure the way the team agreed (see frontend/README.md).
// Retry is offered only when trying again can help.
export function ErrorState({
  error,
  onRetry,
  variant = 'page',
}: ErrorStateProps) {
  const { kind, title, message, retryable, reference } =
    describeApiError(error);
  const canRetry = retryable && onRetry !== undefined;
  const iconColor =
    kind === 'rate-limited' || kind === 'network'
      ? colors.warning
      : colors.danger;

  if (variant === 'banner') {
    const text =
      kind === 'network'
        ? "You're offline. Showing earlier results."
        : "Couldn't refresh. Showing earlier results.";
    return (
      <div
        role="status"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: `1px solid ${colors.border}`,
          borderRadius: layout.radius,
          backgroundColor: colors.surface,
          fontSize: 14,
        }}
      >
        <span style={{ color: iconColor, display: 'flex' }}>
          <Icon name={ICONS[kind]} />
        </span>
        <span style={{ flex: '1 1 180px' }}>{text}</span>
        {canRetry && (
          <button type="button" onClick={onRetry} style={linkButton}>
            <Icon name="refresh" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div role="alert" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: colors.textMuted,
          }}
        >
          <span style={{ color: iconColor, display: 'flex' }}>
            <Icon name={ICONS[kind]} />
          </span>
          {title}
        </span>
        {canRetry && (
          <button type="button" onClick={onRetry} style={linkButton}>
            <Icon name="refresh" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 10,
        padding: '40px 16px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          backgroundColor: colors.surface,
          color: kind === 'not-found' ? colors.textMuted : iconColor,
        }}
      >
        <Icon name={ICONS[kind]} />
      </span>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p style={{ margin: 0, color: colors.textMuted, maxWidth: '36ch' }}>
        {message}
      </p>
      {canRetry && (
        <button type="button" onClick={onRetry} style={buttonStyles.lost}>
          <Icon name="refresh" />
          Try again
        </button>
      )}
      {reference && (
        <code style={{ fontSize: 12, color: colors.textMuted }}>
          {reference}
        </code>
      )}
    </div>
  );
}
