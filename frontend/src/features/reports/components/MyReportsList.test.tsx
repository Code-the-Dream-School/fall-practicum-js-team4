import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testUser,
} from '../../../test/server';
import { renderApp } from '../../../test/renderApp';
import type { PetReport } from '../../../types/reports';

const report = (fields: Partial<PetReport>): PetReport => ({
  petReportId: 1,
  userId: testUser.id,
  reportType: 'LOST',
  status: 'ACTIVE',
  petType: 'DOG',
  petName: 'Milo',
  breed: 'Golden Retriever',
  color: 'Golden',
  size: 'LARGE',
  gender: 'MALE',
  eventDate: '2026-10-28T00:00:00.000Z',
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T10:00:00.000Z',
  location: { zipCode: '90210', city: 'Beverly Hills', state: 'CA' },
  photos: [],
  ...fields,
});

const milo = report({});
const luna = report({
  petReportId: 2,
  petName: 'Luna',
  petType: 'CAT',
  status: 'REUNITED',
});
const foundDog = report({ petReportId: 3, reportType: 'FOUND', petName: null });

// GET /mine returns `reports`; PATCH updates them like the real API
const mockMyReports = (initial: PetReport[]) => {
  let reports = initial;
  const patches: { id: string; body: unknown }[] = [];
  server.use(
    http.get(`${API}/api/reports/mine`, () =>
      HttpResponse.json({
        success: true,
        data: { total: reports.length, reports },
      }),
    ),
    http.patch(`${API}/api/reports/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Partial<PetReport>;
      patches.push({ id: params.id as string, body });
      reports = reports.map((r) =>
        String(r.petReportId) === params.id ? { ...r, ...body } : r,
      );
      const updated = reports.find((r) => String(r.petReportId) === params.id);
      return HttpResponse.json({ success: true, data: updated });
    }),
  );
  return patches;
};

const card = async (name: string) =>
  (await screen.findByRole('heading', { name })).closest('li') as HTMLElement;

describe('My reports on the profile page', () => {
  it('offers "Mark Reunited" only on active lost reports', async () => {
    signedIn();
    mockMyReports([milo, luna, foundDog]);
    renderApp('/profile');

    expect(
      within(await card('Milo')).getByRole('button', {
        name: /mark reunited/i,
      }),
    ).toBeInTheDocument();

    const lunaCard = await card('Luna');
    expect(within(lunaCard).getByText('Reunited safe')).toBeInTheDocument();
    expect(
      within(lunaCard).getByText('Reunited with family'),
    ).toBeInTheDocument();
    expect(within(lunaCard).queryByRole('button')).not.toBeInTheDocument();

    expect(
      within(await card('Found dog')).queryByRole('button'),
    ).not.toBeInTheDocument();
  });

  it('marks the pet as reunited after the owner confirms', async () => {
    signedIn();
    const patches = mockMyReports([milo]);
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    expect(
      within(miloCard).getByText(/is milo back home\?/i),
    ).toBeInTheDocument();
    expect(patches).toHaveLength(0);

    await user.click(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    );

    // The reunited badge replaces "Lost pet"
    expect(
      await within(miloCard).findByText('Reunited safe'),
    ).toBeInTheDocument();
    expect(within(miloCard).queryByText('Lost pet')).not.toBeInTheDocument();
    // Only the badge changes: the date stays (the design mockup overwrote it)
    expect(within(miloCard).getByText('Oct 28, 2026')).toBeInTheDocument();
    // No second click possible
    expect(within(miloCard).queryByRole('button')).not.toBeInTheDocument();
    expect(patches).toEqual([{ id: '1', body: { status: 'REUNITED' } }]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Case updated to Reunited!',
    );
  });

  it('changes nothing when the owner cancels', async () => {
    signedIn();
    const patches = mockMyReports([milo]);
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    await user.click(within(miloCard).getByRole('button', { name: 'Cancel' }));

    expect(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    ).toBeInTheDocument();
    expect(within(miloCard).getByText('Lost pet')).toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it('explains a failed save, keeps the report active and does not retry', async () => {
    signedIn();
    mockMyReports([milo]);
    let attempts = 0;
    server.use(
      http.patch(`${API}/api/reports/:id`, () => {
        attempts++;
        return errorResponse(500, 'INTERNAL_ERROR');
      }),
    );
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    await user.click(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    );

    expect(await within(miloCard).findByRole('alert')).toHaveTextContent(
      "Something went wrong on our side. The report wasn't changed.",
    );
    expect(within(miloCard).getByText('Lost pet')).toBeInTheDocument();
    expect(attempts).toBe(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the total and a link to file a new report', async () => {
    signedIn();
    mockMyReports([milo, luna]);
    renderApp('/profile');

    expect(await screen.findByText('2 total reports')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /file new report/i }),
    ).toHaveAttribute('href', '/report-pet');
  });

  it('says so when the user has no reports', async () => {
    signedIn();
    mockMyReports([]);
    renderApp('/profile');

    expect(
      await screen.findByText(/you haven't reported any pets yet/i),
    ).toBeInTheDocument();
  });

  it('shows the profile card with the report counts', async () => {
    signedIn();
    mockMyReports([milo, luna, foundDog]);
    renderApp('/profile');

    const profile = await screen.findByRole('complementary', {
      name: /your profile/i,
    });
    expect(
      within(profile).getByRole('heading', { level: 1, name: testUser.name }),
    ).toBeInTheDocument();
    expect(within(profile).getByText(testUser.email)).toBeInTheDocument();
    expect(within(profile).getByText('Oct 2026')).toBeInTheDocument();

    const stat = (label: string) =>
      within(profile).getByText(label).previousElementSibling;
    expect(await within(profile).findByText('3')).toBeInTheDocument();
    expect(stat('Reports Filed')).toHaveTextContent('3');
    expect(stat('Active')).toHaveTextContent('2');
    expect(stat('Reunited')).toHaveTextContent('1');
  });
});
