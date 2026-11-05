import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, Toast } from './Toast';

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the message, then asks to be dismissed', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Saved!" onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved!');
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps an empty live region when there is no message', () => {
    render(<Toast message={null} onDismiss={() => {}} />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
