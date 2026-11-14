import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { API, server, signedIn, testUser } from '../test/server';
import { PATHS } from '../app/paths';
import type { PetReport } from '../types/reports';
import { http, HttpResponse, delay } from 'msw';
import userEvent from '@testing-library/user-event';

const testReport: PetReport = {
  petReportId: 100,
  userId: testUser.id,
  reportType: 'LOST',
  status: 'ACTIVE',
  petType: 'CAT',
  petName: 'Gera',
  breed: 'Sphynx',
  color: 'Gray',
  size: 'SMALL',
  gender: 'FEMALE',
  distinctiveFeatures: 'flock, very small, green eyes',
  eventDate: '2026-10-25',
  contactInfo: 'sam@example.com',
  location: {
    zipCode: '92101',
    city: 'San Diego',
    state: 'CA',
  },
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
};

describe('UpdateReportPage', () => {
  it('1. loads and displays the existing pet report', async () => {
    signedIn();
    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json({
          success: true,
          data: testReport,
        }),
      ),
    );
    renderApp(PATHS.editReport('100'));

    expect(
      await screen.findByRole('heading', { name: 'Update Pet Report' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Report ID: 100')).toBeInTheDocument();
    expect(screen.getByLabelText('Pet Name (optional)')).toHaveValue('Gera');
    expect(screen.getByLabelText('Breed (optional)')).toHaveValue('Sphynx');

    expect(screen.getByLabelText('Pet Type (required)')).toHaveValue('CAT');
    expect(screen.getByLabelText('Color (required)')).toHaveValue('Gray');
    expect(screen.getByLabelText('Size (required)')).toHaveValue('SMALL');
    expect(screen.getByLabelText('Gender (required)')).toHaveValue('FEMALE');

    expect(
      screen.getByLabelText('Distinctive Features (optional)'),
    ).toHaveValue('flock, very small, green eyes');

    expect(screen.getByLabelText('Date Lost (required)')).toHaveValue(
      '2026-10-25',
    );
    expect(screen.getByLabelText('Contact Information (optional)')).toHaveValue(
      'sam@example.com',
    );
    expect(screen.getByLabelText('ZIP Code (optional)')).toHaveValue('92101');
    expect(
      screen.getByLabelText('City (required if providing location)'),
    ).toHaveValue('San Diego');
    expect(
      screen.getByLabelText('State (required if providing location)'),
    ).toHaveValue('CA');
  });

  it('2. displays loading state while fetching the report', async () => {
    signedIn();
    server.use(
      http.get(`${API}/api/reports/100`, async () => {
        await delay(100);

        return HttpResponse.json({
          success: true,
          data: testReport,
        });
      }),
    );
    renderApp(PATHS.editReport('100'));

    expect(await screen.findByText('Loading report...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Update Pet Report' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading report...')).not.toBeInTheDocument();
  });

  it('3. updates an existing pet report successfully', async () => {
    signedIn();

    const user = userEvent.setup();
    let patchCalled = false;

    server.use(
      http.get(`${API}/api/reports/100`, () => {
        return HttpResponse.json({
          success: true,
          data: testReport,
        });
      }),

      http.patch(`${API}/api/reports/100`, async ({ request }) => {
        patchCalled = true;

        const body = await request.json();

        expect(body).toEqual(
          expect.objectContaining({
            petName: 'Chucha',
          }),
        );
        return HttpResponse.json({
          success: true,
          data: {
            ...testReport,
            petName: 'Chucha',
          },
        });
      }),
      http.get(`${API}/api/reports/100/public`, () =>
        HttpResponse.json({
          success: true,
          data: {
            petReportId: testReport.petReportId,
            reportType: testReport.reportType,
            status: testReport.status,
            petType: testReport.petType,
            petName: 'Chucha',
            breed: testReport.breed ?? null,
            color: testReport.color,
            size: testReport.size,
            gender: testReport.gender,
            distinctiveFeatures: testReport.distinctiveFeatures ?? null,
            eventDate: testReport.eventDate,
            createdAt: testReport.createdAt,
            location: testReport.location ?? null,
            photos: [],
          },
        }),
      ),
    );

    renderApp(PATHS.editReport('100'));

    const petNameInput = await screen.findByLabelText('Pet Name (optional)');

    expect(petNameInput).toHaveValue('Gera');

    await user.clear(petNameInput);
    await user.type(petNameInput, 'Chucha');
    await user.click(screen.getByRole('button', { name: /save|update/i }));
    await waitFor(() => {
      expect(patchCalled).toBe(true);
    });

    expect(
      await screen.findByRole('heading', {
        name: 'Chucha',
      }),
    ).toBeInTheDocument();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Report updated successfully.',
    );
  });

  it('4. displays a 404 error when the report is not found', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/100`, () => {
        return HttpResponse.json(
          {
            success: false,
            code: 'NOT_FOUND',
            message: 'Report not found.',
          },
          { status: 404 },
        );
      }),
    );
    renderApp(PATHS.editReport('100'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Report not found.',
    );
    expect(
      screen.queryByLabelText('Pet Name (optional)'),
    ).not.toBeInTheDocument();
  });

  it('5. displays an error when the server returns 500', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/100`, () => {
        return HttpResponse.json(
          {
            success: false,
            message: 'Internal Server Error.',
          },
          { status: 500 },
        );
      }),
    );
    renderApp(PATHS.editReport('100'));

    expect(
      await screen.findByText('Unable to load the report. Please try again.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Pet Name (optional)'),
    ).not.toBeInTheDocument();
  });

  it('6. displays an error when updating the report fails', async () => {
    signedIn();
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json({
          success: true,
          data: testReport,
        }),
      ),

      http.patch(`${API}/api/reports/100`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Internal Server Error.',
          },
          { status: 500 },
        ),
      ),
    );

    renderApp(PATHS.editReport('100'));

    const petNameInput = await screen.findByLabelText('Pet Name (optional)');

    await user.clear(petNameInput);
    await user.type(petNameInput, 'Chucha');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to update the report. Please try again.',
    );

    expect(petNameInput).toHaveValue('Chucha');
  });

  it('7. shows an access denied message when the API returns 403 error', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'FORBIDDEN',
            message: 'You can only view your own report.',
          },
          { status: 403 },
        ),
      ),
    );

    renderApp(PATHS.editReport('100'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You don't have permission to edit this report.",
    );

    expect(
      screen.queryByRole('heading', { name: 'Update Pet Report' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument();
  });

  it('8. prevents editing a report owned by another user', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json({
          success: true,
          data: { ...testReport, userId: 'different-user-id' },
        }),
      ),
    );

    renderApp(PATHS.editReport('100'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You don't have permission to edit this report.",
    );

    expect(
      screen.queryByRole('heading', { name: 'Update Pet Report' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument();
  });

  it('9. limits new photos based on existing photos', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...testReport,
            photos: [
              { petPhotoId: 1, imageUrl: '/photo1.jpg' },
              { petPhotoId: 2, imageUrl: '/photo2.jpg' },
              { petPhotoId: 3, imageUrl: '/photo3.jpg' },
            ],
          },
        }),
      ),
    );

    renderApp(PATHS.editReport('100'));

    expect(
      await screen.findByRole('heading', { name: 'Update Pet Report' }),
    ).toBeInTheDocument();

    expect(screen.getByText(/0 \/ 2 photos/)).toBeInTheDocument();
  });

  it('10. increases available photo slots when an existing photo is removed', async () => {
    signedIn();
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/api/reports/100`, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...testReport,
            photos: [
              { petPhotoId: 1, imageUrl: '/photo1.jpg' },
              { petPhotoId: 2, imageUrl: '/photo2.jpg' },
              { petPhotoId: 3, imageUrl: '/photo3.jpg' },
            ],
          },
        }),
      ),
    );

    renderApp(PATHS.editReport('100'));

    expect(await screen.findByText(/0 \/ 2 photos/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));

    expect(await screen.findByText(/0 \/ 3 photos/)).toBeInTheDocument();
  });
});
