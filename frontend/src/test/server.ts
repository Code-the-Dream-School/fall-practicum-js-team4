import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { User } from '../services/authApi';
import type { PublicReport, ReportType } from '../types/reports';

// Fake backend for tests. Override a handler in a single test with
// server.use(...); overrides are reset after every test (see setup.ts).
export const API = 'http://localhost:8080';

export const testUser: User = {
  id: 'user-1',
  email: 'sam@example.com',
  name: 'Sam Rivera',
  createdAt: '2026-10-16T19:40:00.000Z',
};
export const testPassword = 'correct-horse-1';

export const errorResponse = (status: number, code: string, message = code) =>
  HttpResponse.json({ success: false, code, message }, { status });

export const testReports: PublicReport[] = [
  {
    petReportId: 1,
    reportType: 'LOST',
    status: 'ACTIVE',
    petType: 'DOG',
    petName: 'Biscuit',
    breed: 'Beagle',
    color: 'Tricolor',
    size: 'MEDIUM',
    gender: 'MALE',
    distinctiveFeatures: 'Red collar with a bell',
    eventDate: '2026-10-30T00:00:00.000Z',
    createdAt: '2026-10-30T14:00:00.000Z',
    location: { city: 'Raleigh', state: 'NC', zipCode: '27601' },
    photos: [{ petPhotoId: 1, imageUrl: 'https://example.com/biscuit.jpg' }],
  },
  {
    petReportId: 2,
    reportType: 'FOUND',
    status: 'ACTIVE',
    petType: 'CAT',
    petName: null,
    breed: null,
    color: 'Gray',
    size: 'SMALL',
    gender: 'UNKNOWN',
    distinctiveFeatures: null,
    eventDate: '2026-10-29T00:00:00.000Z',
    createdAt: '2026-10-29T09:00:00.000Z',
    location: null,
    photos: [],
  },
];

export const reportListResponse = (reports: PublicReport[]) =>
  HttpResponse.json({
    success: true,
    data: { reports, total: reports.length, page: 1, limit: 12 },
  });

export const server = setupServer(
  // Signed out unless a test says otherwise
  http.get(`${API}/api/auth/me`, () =>
    errorResponse(401, 'UNAUTHENTICATED', 'Please sign in'),
  ),
  http.post(`${API}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email !== testUser.email || body.password !== testPassword) {
      return errorResponse(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect',
      );
    }
    return HttpResponse.json({ success: true, data: { user: testUser } });
  }),
  http.post(`${API}/api/auth/logout`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),
  http.get(`${API}/api/reports`, ({ request }) => {
    const type = new URL(request.url).searchParams.get(
      'type',
    ) as ReportType | null;
    return reportListResponse(
      testReports.filter((report) => !type || report.reportType === type),
    );
  }),
);

// Makes GET /me answer as if the session cookie were valid
export const signedIn = () =>
  server.use(
    http.get(`${API}/api/auth/me`, () =>
      HttpResponse.json({ success: true, data: { user: testUser } }),
    ),
  );
