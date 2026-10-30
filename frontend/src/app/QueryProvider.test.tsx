import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { http } from 'msw';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from '../context/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { QueryView } from '../components/QueryView';
import { LoginPage } from '../pages/LoginPage';
import { apiRequest } from '../services/api';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testPassword,
  testUser,
} from '../test/server';
import { QueryProvider } from './QueryProvider';

// A protected page that loads data with useQuery, like the real pages will
function MyReportsPage() {
  const query = useQuery({
    queryKey: ['reports', 'mine'],
    queryFn: () => apiRequest<{ total: number }>('/api/reports/mine'),
  });
  return (
    <QueryView query={query}>
      {(data) => <p>You have {data.total} reports</p>}
    </QueryView>
  );
}

const renderAt = (path: string, page = <MyReportsPage />) => {
  render(
    <AuthProvider>
      <QueryProvider retryDelay={0}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/my-reports" element={page} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryProvider>
    </AuthProvider>,
  );
  return userEvent.setup();
};

describe('QueryProvider', () => {
  it('a 401 signs the user out, explains why, and returns them after signing in', async () => {
    signedIn();
    let sessionValid = false;
    server.use(
      http.get(`${API}/api/reports/mine`, () =>
        sessionValid
          ? Response.json({ success: true, data: { total: 3 } })
          : errorResponse(401, 'UNAUTHENTICATED', 'Please sign in'),
      ),
    );
    const user = renderAt('/my-reports');

    expect(
      await screen.findByText(
        'Your session expired. Sign in again to continue.',
      ),
    ).toBeInTheDocument();

    sessionValid = true;
    await user.type(screen.getByLabelText(/email address/i), testUser.email);
    await user.type(screen.getByLabelText(/^password/i), testPassword);
    await user.click(
      screen.getByRole('button', { name: /sign in to pawradar/i }),
    );

    expect(
      await screen.findByText('You have 3 reports', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('forgets cached data when the user signs out', async () => {
    signedIn();
    let queryClient: QueryClient | undefined;
    function CacheProbe() {
      const client = useQueryClient();
      useEffect(() => {
        queryClient = client;
      });
      const { signOut, status } = useAuth();
      return (
        <>
          <p>status: {status}</p>
          <button type="button" onClick={() => void signOut()}>
            sign out
          </button>
        </>
      );
    }
    render(
      <AuthProvider>
        <QueryProvider retryDelay={0}>
          <CacheProbe />
        </QueryProvider>
      </AuthProvider>,
    );
    await screen.findByText('status: authenticated');
    queryClient!.setQueryData(['reports', 'mine'], { total: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() =>
      expect(queryClient!.getQueryData(['reports', 'mine'])).toBeUndefined(),
    );
  });
});
