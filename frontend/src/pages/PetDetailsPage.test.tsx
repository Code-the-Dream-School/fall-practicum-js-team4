import { screen } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { describe, expect, it } from 'vitest';
import { PATHS } from '../app/paths';
import { formatEventDate } from '../features/reports/format';
import { renderApp } from '../test/renderApp';
import { milo, luna } from '../test/reports';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testReports,
} from '../test/server';
import type { PetReport, PublicReport } from '../types/reports';

const successResponse = (data: PetReport | PublicReport) =>
  HttpResponse.json({ success: true, data });

describe('PetDetailsPage', () => {
  it('loads an ACTIVE report for a guest using only the public endpoint', async () => {
    const requests: string[] = [];
    const biscuit = testReports[0];

    server.use(
      http.get(`${API}/api/reports/:id/public`, ({ params }) => {
        requests.push(String(params.id));
        return successResponse(biscuit);
      }),
    );

    renderApp(PATHS.petDetails('1'));

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Beagle')).toBeInTheDocument();
    expect(screen.getByText('Tricolor')).toBeInTheDocument();
    expect(screen.getByText('Raleigh, NC 27601')).toBeInTheDocument();
    expect(
      screen.getByText(formatEventDate(biscuit.eventDate)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Photo 1 of Biscuit' }),
    ).toHaveAttribute('src', 'https://example.com/biscuit.jpg');

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    expect(requests).toEqual(['1']);
  });

  it('shows Edit to the authenticated owner of an ACTIVE report', async () => {
    signedIn();
    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id`, ({ params }) => {
        requests.push(String(params.id));
        return successResponse(milo);
      }),
    );

    renderApp(PATHS.petDetails('1'));

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Edit report' })).toHaveAttribute(
      'href',
      PATHS.editReport('1'),
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Active')).toHaveAttribute('data-status', 'ACTIVE');
    expect(requests).toEqual(['1']);
  });

  it('shows REUNITED details and Edit to the report owner', async () => {
    signedIn();
    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id`, ({ params }) => {
        requests.push(`owner:${params.id}`);
        return successResponse(luna);
      }),
    );

    renderApp(PATHS.petDetails('2'));

    expect(
      await screen.findByRole('heading', { name: 'Luna' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Reunited')).toBeInTheDocument();
    expect(screen.getByText('Reunited')).toHaveAttribute(
      'data-status',
      'REUNITED',
    );
    expect(screen.getByRole('link', { name: 'Edit report' })).toHaveAttribute(
      'href',
      PATHS.editReport('2'),
    );

    expect(requests).toEqual(['owner:2']);
  });

  it('shows CLOSED details and Edit to the report owner', async () => {
    signedIn();

    server.use(
      http.get(`${API}/api/reports/:id`, () =>
        successResponse({
          ...milo,
          petReportId: 4,
          status: 'CLOSED',
        }),
      ),
    );

    renderApp(PATHS.petDetails('4'));

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toHaveAttribute('data-status', 'CLOSED');
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Edit report' })).toHaveAttribute(
      'href',
      PATHS.editReport('4'),
    );
  });

  it('falls back to public details for an authenticated nonowner', async () => {
    signedIn();
    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id`, () => {
        requests.push('owner');
        return errorResponse(403, 'FORBIDDEN');
      }),
      http.get(`${API}/api/reports/:id/public`, () => {
        requests.push('public');
        return successResponse(testReports[0]);
      }),
    );

    renderApp(PATHS.petDetails('1'));

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    expect(requests).toEqual(['owner', 'public']);
  });

  it('does not expose a REUNITED report to a guest', async () => {
    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id/public`, () => {
        requests.push('public');
        return errorResponse(404, 'NOT_FOUND', 'Report not found');
      }),
    );

    renderApp(PATHS.petDetails('2'));

    expect(
      await screen.findByRole('heading', { name: "This doesn't exist" }),
    ).toBeInTheDocument();

    expect(screen.queryByText('Luna')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    expect(requests).toEqual(['public']);
  });

  it('does not expose a REUNITED report to an authenticated nonowner', async () => {
    signedIn();
    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id`, () => {
        requests.push('owner');
        return errorResponse(403, 'FORBIDDEN');
      }),
      http.get(`${API}/api/reports/:id/public`, () => {
        requests.push('public');
        return errorResponse(404, 'NOT_FOUND', 'Report not found');
      }),
    );

    renderApp(PATHS.petDetails('2'));

    expect(
      await screen.findByRole('heading', { name: "This doesn't exist" }),
    ).toBeInTheDocument();

    expect(screen.queryByText('Luna')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    expect(requests).toEqual(['owner', 'public']);
  });

  it('displays the shared not-found state for a missing public report', async () => {
    server.use(
      http.get(`${API}/api/reports/:id/public`, () =>
        errorResponse(404, 'NOT_FOUND', 'Report not found'),
      ),
    );

    renderApp(PATHS.petDetails('99'));

    expect(
      await screen.findByRole('heading', { name: "This doesn't exist" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();
  });

  it('handles missing optional information and photos', async () => {
    server.use(
      http.get(`${API}/api/reports/:id/public`, () =>
        successResponse(testReports[1]),
      ),
    );

    renderApp(PATHS.petDetails('2'));

    expect(
      await screen.findByRole('heading', { name: 'Found cat' }),
    ).toBeInTheDocument();

    expect(screen.getByText('no photos available')).toBeInTheDocument();
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: /Back to Found Pets/ }),
    ).toHaveAttribute('href', PATHS.foundPets);
  });

  it('rejects an invalid report ID before fetching report details', () => {
    renderApp('/pets/not-a-number');

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid report link.');
  });

  it('preserves directory filters when navigating to details and back', async () => {
    server.use(
      http.get(`${API}/api/reports/:id/public`, () =>
        successResponse(testReports[0]),
      ),
    );

    const directoryUrl = '/lost-pets?size=MEDIUM&sort=oldest';
    const { user } = renderApp(directoryUrl);

    await user.click(await screen.findByRole('link', { name: 'Biscuit' }));

    expect(
      await screen.findByRole('heading', { name: 'Biscuit', level: 1 }),
    ).toBeInTheDocument();

    const backLink = screen.getByRole('link', {
      name: /Back to Lost Pets/,
    });

    expect(backLink).toHaveAttribute('href', directoryUrl);

    await user.click(backLink);

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();
  });

  it('uses the correct directory fallback for a direct report link', async () => {
    server.use(
      http.get(`${API}/api/reports/:id/public`, () =>
        successResponse(testReports[0]),
      ),
    );

    renderApp(PATHS.petDetails('1'));

    await screen.findByRole('heading', { name: 'Biscuit' });

    expect(
      screen.getByRole('link', { name: /Back to Lost Pets/ }),
    ).toHaveAttribute('href', PATHS.lostPets);
  });

  it('shows loading while waiting for report details', async () => {
    server.use(
      http.get(`${API}/api/reports/:id/public`, async () => {
        await delay(120);
        return successResponse(testReports[0]);
      }),
    );

    renderApp(PATHS.petDetails('1'));

    expect(
      await screen.findByText('Loading pet report...'),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();

    expect(screen.queryByText('Loading pet report...')).not.toBeInTheDocument();
  });

  it('retries server errors automatically and allows manual retry', async () => {
    let attempts = 0;
    let shouldFail = true;

    server.use(
      http.get(`${API}/api/reports/:id/public`, () => {
        attempts++;

        return shouldFail
          ? errorResponse(500, 'INTERNAL_ERROR')
          : successResponse(testReports[0]);
      }),
    );

    const { user } = renderApp(PATHS.petDetails('1'));

    const retryButton = await screen.findByRole('button', {
      name: 'Try again',
    });

    // Initial request plus two automatic retries
    expect(attempts).toBe(3);

    // Simulate the server recovering
    shouldFail = false;
    await user.click(retryButton);

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();

    expect(attempts).toBe(4);
  });

  it('does not fall back to public details on an owner server error', async () => {
    signedIn();

    let ownerRequests = 0;
    let publicRequests = 0;

    server.use(
      http.get(`${API}/api/reports/:id`, () => {
        ownerRequests++;
        return errorResponse(500, 'INTERNAL_ERROR');
      }),
      http.get(`${API}/api/reports/:id/public`, () => {
        publicRequests++;
        return successResponse(testReports[0]);
      }),
    );

    renderApp(PATHS.petDetails('1'));

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();

    expect(ownerRequests).toBe(3);
    expect(publicRequests).toBe(0);

    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();
  });
  it('removes owner-only details after logout and shows public data when revisiting', async () => {
    signedIn();

    const requests: string[] = [];

    server.use(
      http.get(`${API}/api/reports/:id`, () => {
        requests.push('owner');
        return successResponse(milo);
      }),
      http.get(`${API}/api/reports/:id/public`, () => {
        requests.push('public');
        return successResponse(testReports[0]);
      }),
    );

    const { user } = renderApp(PATHS.petDetails('1'));

    // The signed-in owner can see their report and Edit link
    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Edit report' }),
    ).toBeInTheDocument();

    // Signing out returns the user to the login page
    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(
      await screen.findByRole('heading', {
        name: /welcome back to pawradar/i,
      }),
    ).toBeInTheDocument();

    // Visit the public Lost Pets directory and reopen the report
    await user.click(screen.getByRole('link', { name: 'Lost Pets' }));
    await user.click(await screen.findByRole('link', { name: 'Biscuit' }));

    expect(
      await screen.findByRole('heading', { name: 'Biscuit', level: 1 }),
    ).toBeInTheDocument();

    // No owner-only information or controls should remain
    expect(
      screen.queryByRole('heading', { name: 'Milo' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Edit report' }),
    ).not.toBeInTheDocument();

    // The report must be retrieved through the public endpoint.
    expect(requests[0]).toBe('owner');
    expect(requests).toContain('public');
  });
});
