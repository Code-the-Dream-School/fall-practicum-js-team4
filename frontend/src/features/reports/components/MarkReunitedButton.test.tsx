import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../../app/queryClient';
import { foundDog, luna, milo, mockMyReports } from '../../../test/reports';
import { API, server } from '../../../test/server';
import type { PetReport } from '../../../types/reports';
import { MarkReunitedButton } from './MarkReunitedButton';

const renderButton = (
  pet: PetReport,
  onReunited?: (report: PetReport) => void,
) => {
  const client = createQueryClient({
    onSessionExpired: () => {},
    retryDelay: 0,
  });
  render(
    <QueryClientProvider client={client}>
      <MarkReunitedButton report={pet} onReunited={onReunited} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
};

describe('MarkReunitedButton', () => {
  it.each([
    ['a found report', foundDog],
    ['a report already reunited', luna],
  ])('renders nothing for %s', (_, pet) => {
    renderButton(pet);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens confirmation modal with generic copy when clicked', async () => {
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Confirm to mark the report as reunited, this step cannot be undone.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('closes the modal without calling API when cancel is clicked', async () => {
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('passes the saved report to onReunited', async () => {
    mockMyReports([milo]);
    const onReunited = vi.fn();
    const { user } = renderButton(milo, onReunited);

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));
    await user.click(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    );

    await vi.waitFor(() => expect(onReunited).toHaveBeenCalledTimes(1));
    expect(onReunited.mock.calls[0][0]).toMatchObject({
      petReportId: milo.petReportId,
      status: 'REUNITED',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables both buttons while saving', async () => {
    server.use(http.patch(`${API}/api/reports/:id`, () => delay('infinite')));
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));
    await user.click(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    );

    expect(
      await screen.findByRole('button', { name: 'Saving…' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows an error when the save fails', async () => {
    server.use(
      http.patch(`${API}/api/reports/:id`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Database down',
          },
          { status: 500 },
        ),
      ),
    );
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));
    await user.click(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    );

    expect(
      await screen.findByText(
        /something went wrong on our side\. the report wasn't changed\./i,
      ),
    ).toBeVisible();
  });
});
