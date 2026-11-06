import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../../app/queryClient';
import {
  foundDog,
  luna,
  milo,
  mockMyReports,
  report,
} from '../../../test/reports';
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

  it('asks about the pet type when the pet has no name', async () => {
    const { user } = renderButton(report({ petName: null, petType: 'CAT' }));

    await user.click(screen.getByRole('button', { name: /mark reunited/i }));

    expect(screen.getByText(/is your cat back home\?/i)).toBeInTheDocument();
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
  });

  it('disables both buttons while saving', async () => {
    // The save never answers, so the "Saving…" state stays on screen
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
});
