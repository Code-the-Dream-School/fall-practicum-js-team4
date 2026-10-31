import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon';
import { buttonStyles, colors } from '../styles/theme';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  crashed: boolean;
}

// Catches a component that throws while rendering, so one broken page doesn't
// blank the whole app. Layout wraps the page with it (the navbar stays usable)
// and resets it on navigation.
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

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
        <span style={{ color: colors.lost, display: 'flex' }}>
          <Icon name="bug_report" />
        </span>
        <h2 style={{ margin: 0, fontSize: 18 }}>This page stopped working</h2>
        <p style={{ margin: 0, color: colors.textMuted, maxWidth: '36ch' }}>
          Reloading usually fixes it. The navigation above still works.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={buttonStyles.outline}
        >
          <Icon name="restart_alt" />
          Reload page
        </button>
      </div>
    );
  }
}
