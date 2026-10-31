import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { API, server, signedIn, testUser } from '../test/server';
import { PATHS } from '../app/paths';
import type { PetReport } from '../types/reports';
import { http, HttpResponse, delay } from 'msw';

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

describe('EditReportPage', () => {
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
      await screen.findByRole('heading', { name: 'Edit Pet Report' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Report ID: 100')).toBeInTheDocument();
    expect(screen.getByText('Pet Name: Gera')).toBeInTheDocument();
    expect(screen.getByText('Pet Type: CAT')).toBeInTheDocument();
    expect(screen.getByText('Color: Gray')).toBeInTheDocument();
    expect(
      screen.getByText('flock, very small, green eyes'),
    ).toBeInTheDocument();
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
  });
});
