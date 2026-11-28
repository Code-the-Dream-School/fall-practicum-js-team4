import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../app/queryClient';
import { API, server } from '../test/server';
import { HomePage } from './HomePage';

vi.mock('../features/reports/components/ReportsMap', () => ({
  ReportsMap: () => null,
}));

function renderHome() {
  const requests = vi.fn();

  server.use(
    http.get(`${API}/api/reports`, ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      requests(params);

      return HttpResponse.json({
        success: true,
        data: {
          reports: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      });
    }),
  );

  const client = createQueryClient({
    onSessionExpired: () => {},
    retryDelay: 0,
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { user: userEvent.setup(), requests };
}

describe('HomePage filters', () => {
  it('1. requests active and reunited reports by default', async () => {
    const { requests } = renderHome();

    await waitFor(() => {
      expect(requests).toHaveBeenLastCalledWith(
        expect.objectContaining({
          includeReunited: 'true',
          days: '7',
          page: '1',
        }),
      );
    });

    expect(requests.mock.lastCall?.[0]).not.toHaveProperty('status');
  });

  it.each(['ACTIVE', 'REUNITED'])(
    '2. requests only the selected status %s',
    async (status) => {
      const { user, requests } = renderHome();

      await screen.findByText('No recent reports yet.');
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Report status' }),
        status,
      );
      await waitFor(() => {
        expect(requests).toHaveBeenLastCalledWith(
          expect.objectContaining({ status }),
        );
      });

      expect(requests.mock.lastCall?.[0]).not.toHaveProperty('includeReunited');
    },
  );

  it('3. combines report type and status filters', async () => {
    const { user, requests } = renderHome();

    await screen.findByText('No recent reports yet.');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Report type' }),
      'LOST',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Report status' }),
      'REUNITED',
    );
    await waitFor(() => {
      expect(requests).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'LOST',
          status: 'REUNITED',
        }),
      );
    });
  });

  it('4. includes both statuses again when All statuses is selected', async () => {
    const { user, requests } = renderHome();

    await screen.findByText('No recent reports yet.');

    const statusSelect = screen.getByRole('combobox', {
      name: 'Report status',
    });

    await user.selectOptions(statusSelect, 'REUNITED');
    await waitFor(() => {
      expect(requests).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'REUNITED' }),
      );
    });
    await user.selectOptions(statusSelect, '');
    await waitFor(() => {
      expect(requests).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeReunited: 'true' }),
      );
    });

    expect(requests.mock.lastCall?.[0]).not.toHaveProperty('status');
  });
});
