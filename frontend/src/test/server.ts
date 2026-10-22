import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { User } from '../services/authApi';

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
);

// Makes GET /me answer as if the session cookie were valid
export const signedIn = () =>
  server.use(
    http.get(`${API}/api/auth/me`, () =>
      HttpResponse.json({ success: true, data: { user: testUser } }),
    ),
  );
