import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { ErrorState } from './ErrorState';

const serverError = new ApiError(500, 'INTERNAL_ERROR', 'raw');
const offline = new ApiError(0, 'NETWORK_ERROR', 'raw');
const notFound = new ApiError(404, 'NOT_FOUND', 'raw');

describe('ErrorState', () => {
  it('page: shows the title, message, Try again and a log reference', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={serverError} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(screen.getByText('INTERNAL_ERROR · 500')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('page: offers no retry when it cannot help (404)', () => {
    render(<ErrorState error={notFound} onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent("This doesn't exist");
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('page: offers no retry without an onRetry handler', () => {
    render(<ErrorState error={serverError} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('inline: short title and a Retry link', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState error={serverError} onRetry={onRetry} variant="inline" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(screen.queryByText('INTERNAL_ERROR · 500')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['offline', offline, "You're offline. Showing earlier results."],
    [
      'a server error',
      serverError,
      "Couldn't refresh. Showing earlier results.",
    ],
  ])(
    'banner: says the data on screen may be out of date when %s',
    (_, error, text) => {
      render(<ErrorState error={error} onRetry={vi.fn()} variant="banner" />);

      expect(screen.getByRole('status')).toHaveTextContent(text);
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    },
  );

  it('inline and banner: no Retry for errors that retrying cannot fix', () => {
    const tooMany = new ApiError(429, 'TOO_MANY_REQUESTS', 'raw');
    render(
      <>
        <ErrorState error={tooMany} onRetry={vi.fn()} variant="inline" />
        <ErrorState error={tooMany} onRetry={vi.fn()} variant="banner" />
      </>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
