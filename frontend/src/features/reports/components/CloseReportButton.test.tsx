import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../../app/queryClient';
import { foundDog, milo, mockMyReports, report } from '../../../test/reports';
import { API, server } from '../../../test/server';
import type { PetReport } from '../../../types/reports';
import { CloseReportButton } from './CloseReportButton';

const renderButton = (
  pet: PetReport,
  onClosed?: (report: PetReport) => void,
) => {
  const client = createQueryClient({
    onSessionExpired: () => {},
    retryDelay: 0,
  });
  render(
    <QueryClientProvider client={client}>
      <CloseReportButton report={pet} onClosed={onClosed} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
};

describe('CloseReportButton', () => {
  it('renders nothing for a closed report', () => {
    const closedReport = report({ status: 'CLOSED' });
    renderButton(closedReport);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders "Close Report" button for an active lost report', () => {
    renderButton(milo);

    expect(
      screen.getByRole('button', { name: /close report/i }),
    ).toBeInTheDocument();
  });

  it('renders "Close Report" button for an active found report', () => {
    renderButton(foundDog);

    expect(
      screen.getByRole('button', { name: /close report/i }),
    ).toBeInTheDocument();
  });

  it('opens confirmation modal with generic copy when clicked and focuses Cancel by default', async () => {
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /close report/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Confirm to close the report, this step cannot be undone.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Close report' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes the modal without calling API when cancel is clicked', async () => {
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /close report/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls close endpoint, updates report, and calls onClosed callback', async () => {
    mockMyReports([milo]);
    const onClosed = vi.fn();
    const { user } = renderButton(milo, onClosed);

    await user.click(screen.getByRole('button', { name: /close report/i }));
    await user.click(screen.getByRole('button', { name: 'Close report' }));

    await vi.waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(onClosed.mock.calls[0][0]).toMatchObject({
      petReportId: milo.petReportId,
      status: 'CLOSED',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables buttons while saving', async () => {
    server.use(
      http.patch(`${API}/api/reports/:id/close`, () => delay('infinite')),
    );
    const { user } = renderButton(milo);

    await user.click(screen.getByRole('button', { name: /close report/i }));
    await user.click(screen.getByRole('button', { name: 'Close report' }));

    expect(
      await screen.findByRole('button', { name: 'Saving…' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
