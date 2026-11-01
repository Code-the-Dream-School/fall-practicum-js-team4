import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClientProvider,
  onlineManager,
  useQuery,
} from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { createQueryClient } from '../app/queryClient';
import { QueryView } from './QueryView';

const renderQuery = (
  queryFn: () => Promise<string[]>,
  variant?: 'page' | 'inline',
) => {
  const client = createQueryClient({
    onSessionExpired: vi.fn(),
    retryDelay: 0,
  });
  function Pets() {
    const query = useQuery({ queryKey: ['pets'], queryFn });
    return (
      <QueryView query={query} variant={variant}>
        {(pets) => (
          <ul>
            {pets.map((pet) => (
              <li key={pet}>{pet}</li>
            ))}
          </ul>
        )}
      </QueryView>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <Pets />
    </QueryClientProvider>,
  );
  return client;
};

const serverError = () => new ApiError(500, 'INTERNAL_ERROR', 'raw');

describe('QueryView', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('shows loading, then the data', async () => {
    renderQuery(async () => ['Milo', 'Luna']);

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(await screen.findByText('Milo')).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });

  it('says it is trying again while retrying', async () => {
    let calls = 0;
    renderQuery(
      () =>
        new Promise((_resolve, reject) => {
          calls++;
          // First try fails; the retry stays pending so we can see the message
          if (calls === 1) reject(serverError());
        }),
    );

    expect(
      await screen.findByText('Still loading… trying again (1 of 2).'),
    ).toBeInTheDocument();
  });

  it('shows a page error with Try again when nothing loaded', async () => {
    const queryFn = vi.fn().mockRejectedValue(serverError());
    renderQuery(queryFn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(queryFn).toHaveBeenCalledTimes(3);

    queryFn.mockResolvedValueOnce(['Milo']);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Milo')).toBeInTheDocument();
  });

  it('shows an inline error for a section', async () => {
    renderQuery(() => Promise.reject(serverError()), 'inline');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side',
    );
    expect(
      screen.queryByRole('button', { name: /try again/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('keeps the data on screen and adds a banner when a refresh fails', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce(['Milo'])
      .mockRejectedValue(serverError());
    const client = renderQuery(queryFn);
    expect(await screen.findByText('Milo')).toBeInTheDocument();

    await client.refetchQueries({ queryKey: ['pets'] });

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Couldn't refresh. Showing earlier results.",
    );
    expect(screen.getByText('Milo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('when the browser is offline (requests are paused, not failed)', () => {
    it('says it will load once back online, without a Retry that cannot help', async () => {
      onlineManager.setOnline(false);
      const queryFn = vi.fn().mockResolvedValue(['Milo']);
      renderQuery(queryFn);

      expect(await screen.findByRole('status')).toHaveTextContent(
        "You're offlineThis will load automatically when you're back online.",
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(queryFn).not.toHaveBeenCalled();

      act(() => onlineManager.setOnline(true));

      expect(await screen.findByText('Milo')).toBeInTheDocument();
    });

    it('keeps the data on screen with an offline banner when a refresh is paused', async () => {
      const queryFn = vi.fn().mockResolvedValue(['Milo']);
      const client = renderQuery(queryFn);
      expect(await screen.findByText('Milo')).toBeInTheDocument();

      act(() => onlineManager.setOnline(false));
      void client.refetchQueries({ queryKey: ['pets'] });

      expect(await screen.findByRole('status')).toHaveTextContent(
        "You're offline. Showing earlier results.",
      );
      expect(screen.getByText('Milo')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
