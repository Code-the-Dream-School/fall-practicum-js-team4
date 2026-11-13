import { useAuth } from '../context/useAuth';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PetDetailsPage } from './PetDetailsPage';
import {
  getReportDetails,
  isReportOwnedByCurrentUser,
} from '../services/reportApi';
import { ApiError } from '../services/api';
import type { ReportDetails } from '../types/reports';

vi.mock('../services/reportApi', () => ({
  getReportDetails: vi.fn(),
  isReportOwnedByCurrentUser: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

const mockGetReportDetails = vi.mocked(getReportDetails);

const mockIsReportOwnedByCurrentUser = vi.mocked(isReportOwnedByCurrentUser);

const report: ReportDetails = {
  petReportId: 123,
  reportType: 'LOST',
  status: 'ACTIVE',
  petType: 'DOG',
  petName: 'Milo',
  breed: 'Mixed breed',
  color: 'Brown and white',
  size: 'MEDIUM',
  gender: 'MALE',
  distinctiveFeatures: 'White patch on chest',
  eventDate: '2026-11-02',
  location: {
    zipCode: '23220',
    city: 'Richmond',
    state: 'VA',
  },
  photos: [],
};

function renderDetails(path = '/pets/123', state?: { successMessage: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/pets/:id" element={<PetDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PetDetailsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsReportOwnedByCurrentUser.mockResolvedValue(false);

    mockUseAuth.mockReturnValue({
      user: null,
      status: 'unauthenticated',
      signedOutByUser: false,
      sessionExpired: false,
      setSession: vi.fn(),
      signOut: vi.fn(async () => {}),
      expireSession: vi.fn(),
      clearSignedOutByUser: vi.fn(),
    });
  });

  it('loads and displays a pet report', async () => {
    mockGetReportDetails.mockResolvedValue(report);

    renderDetails();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading pet report...',
    );

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Mixed breed')).toBeInTheDocument();
    expect(screen.getByText('Brown and white')).toBeInTheDocument();
    expect(screen.getByText('Richmond, VA 23220')).toBeInTheDocument();

    expect(mockGetReportDetails).toHaveBeenCalledWith('123');
  });

  it('displays the success message after updating a report', async () => {
    mockGetReportDetails.mockResolvedValue(report);

    renderDetails('/pets/123', {
      successMessage: 'Report updated successfully.',
    });

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Report updated successfully.',
    );
  });

  it('handles a report with missing optional details', async () => {
    mockGetReportDetails.mockResolvedValue({
      ...report,
      petName: null,
      breed: null,
      distinctiveFeatures: null,
      location: null,
    });

    renderDetails();

    expect(
      await screen.findByRole('heading', { name: 'DOG Report' }),
    ).toBeInTheDocument();

    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
    expect(screen.getByText('no photos available')).toBeInTheDocument();
  });

  it('displays available pet photos', async () => {
    mockGetReportDetails.mockResolvedValue({
      ...report,
      photos: [
        {
          petPhotoId: 1,
          imageUrl: 'https://example.com/milo.jpg',
        },
      ],
    });

    renderDetails();

    expect(
      await screen.findByRole('img', { name: 'Photo 1 of Milo' }),
    ).toHaveAttribute('src', 'https://example.com/milo.jpg');
  });

  it('shows a not-found message for a missing report', async () => {
    mockGetReportDetails.mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Report not found'),
    );

    renderDetails();

    expect(
      await screen.findByRole('heading', {
        name: 'Report not found',
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error and allows retrying', async () => {
    const user = userEvent.setup();

    mockGetReportDetails
      .mockRejectedValueOnce(
        new ApiError(0, 'NETWORK_ERROR', 'Connection failed'),
      )
      .mockResolvedValueOnce(report);

    renderDetails();

    expect(
      await screen.findByRole('heading', {
        name: 'Unable to load report',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    expect(mockGetReportDetails).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid report ID without making a request', () => {
    renderDetails('/pets/not-a-number');

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid report link.');

    expect(mockGetReportDetails).not.toHaveBeenCalled();
  });

  it('does not show Edit to a guest', async () => {
    mockGetReportDetails.mockResolvedValue(report);

    renderDetails();

    await screen.findByRole('heading', { name: 'Milo' });

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    expect(mockIsReportOwnedByCurrentUser).not.toHaveBeenCalled();
  });

  it('does not show Edit to a logged-in non-owner', async () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      status: 'authenticated',
      user: {
        id: 'other-user',
        email: 'other@example.com',
        name: 'Other User',
        createdAt: '2026-11-05T00:00:00.000Z',
      },
    });

    mockGetReportDetails.mockResolvedValue(report);
    mockIsReportOwnedByCurrentUser.mockResolvedValue(false);

    renderDetails();

    await screen.findByRole('heading', { name: 'Milo' });

    await waitFor(() => {
      expect(mockIsReportOwnedByCurrentUser).toHaveBeenCalledWith(123);
    });

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();
  });

  it('shows Edit to the authenticated report owner', async () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      status: 'authenticated',
      user: {
        id: 'report-owner',
        email: 'owner@example.com',
        name: 'Report Owner',
        createdAt: '2026-11-05T00:00:00.000Z',
      },
    });

    mockGetReportDetails.mockResolvedValue(report);
    mockIsReportOwnedByCurrentUser.mockResolvedValue(true);

    renderDetails();

    expect(
      await screen.findByRole('link', { name: 'Edit report' }),
    ).toHaveAttribute('href', '/pets/123/edit');

    expect(mockIsReportOwnedByCurrentUser).toHaveBeenCalledWith(123);
  });

  it('keeps public details visible if ownership lookup fails', async () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      status: 'authenticated',
      user: {
        id: 'report-owner',
        email: 'owner@example.com',
        name: 'Report Owner',
        createdAt: '2026-11-05T00:00:00.000Z',
      },
    });

    mockGetReportDetails.mockResolvedValue(report);

    mockIsReportOwnedByCurrentUser.mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', 'Connection failed'),
    );

    renderDetails();

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockIsReportOwnedByCurrentUser).toHaveBeenCalledWith(123);
    });

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();
  });

  it('hides Edit when the report owner signs out', async () => {
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      status: 'authenticated',
      user: {
        id: 'report-owner',
        email: 'owner@example.com',
        name: 'Report Owner',
        createdAt: '2026-11-05T00:00:00.000Z',
      },
    });
    mockGetReportDetails.mockResolvedValue(report);
    mockIsReportOwnedByCurrentUser.mockResolvedValue(true);

    const view = renderDetails();

    expect(
      await screen.findByRole('link', { name: 'Edit report' }),
    ).toBeInTheDocument();

    //user signout simulation
    mockUseAuth.mockReturnValue({
      ...mockUseAuth(),
      status: 'unauthenticated',
      user: null,
    });

    view.rerender(
      <MemoryRouter initialEntries={['/pets/123']}>
        <Routes>
          <Route path="/pets/:id" element={<PetDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Milo' })).toBeInTheDocument();

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();
  });
});
