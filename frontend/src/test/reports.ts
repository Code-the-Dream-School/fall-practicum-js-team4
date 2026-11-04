// Pet report fixtures and a fake "my reports" API for tests
import { http, HttpResponse } from 'msw';
import type { PetReport } from '../types/reports';
import { API, server, testUser } from './server';

export const report = (fields: Partial<PetReport>): PetReport => ({
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

export const milo = report({});
export const luna = report({
  petReportId: 2,
  petName: 'Luna',
  petType: 'CAT',
  status: 'REUNITED',
});
export const foundDog = report({
  petReportId: 3,
  reportType: 'FOUND',
  petName: null,
});

// GET /mine returns `reports`; PATCH updates them like the real API.
// Returns the PATCH requests received, to check what was sent
export const mockMyReports = (initial: PetReport[]) => {
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
