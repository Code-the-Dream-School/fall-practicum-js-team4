import { act, render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { API, server, signedIn, testUser } from '../test/server';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import type { AuthContextValue } from './AuthContext';

// Exposes the context so tests can read it and call its functions
let auth: AuthContextValue;
function Probe() {
  const value = useAuth();
  useEffect(() => {
    auth = value;
  });
  return <p>status: {value.status}</p>;
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  it('loads the signed-in user on start', async () => {
    signedIn();
    renderProvider();

    expect(screen.getByText('status: loading')).toBeInTheDocument();
    expect(
      await screen.findByText('status: authenticated'),
    ).toBeInTheDocument();
    expect(auth.user).toEqual(testUser);
  });

  it('is signed out when the session check fails', async () => {
    renderProvider();

    expect(
      await screen.findByText('status: unauthenticated'),
    ).toBeInTheDocument();
    expect(auth.user).toBeNull();
  });

  it.each([
    [
      'succeeds',
      () => HttpResponse.json({ success: true, data: { user: testUser } }),
    ],
    ['fails', () => HttpResponse.error()],
  ])('ignores a session check that %s after unmounting', async (_, respond) => {
    let answered = false;
    server.use(
      http.get(`${API}/api/auth/me`, async () => {
        await delay(20);
        answered = true;
        return respond();
      }),
    );
    const errors = vi.spyOn(console, 'error');
    const { unmount } = renderProvider();

    unmount();
    await waitFor(() => expect(answered).toBe(true));
    // Let the response reach the provider's cleanup check
    await delay(20);

    expect(errors).not.toHaveBeenCalled();
  });

  it('stores the user from setSession', async () => {
    renderProvider();
    await screen.findByText('status: unauthenticated');

    act(() => auth.setSession(testUser));

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(auth.user).toEqual(testUser);
  });

  it('signOut calls the API and clears the user', async () => {
    let loggedOut = false;
    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        loggedOut = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    signedIn();
    renderProvider();
    await screen.findByText('status: authenticated');

    await act(() => auth.signOut());

    expect(loggedOut).toBe(true);
    expect(screen.getByText('status: unauthenticated')).toBeInTheDocument();
    expect(auth.user).toBeNull();
  });

  it.each([
    ['the server is unreachable', () => HttpResponse.error()],
    ['the server returns 500', () => new HttpResponse(null, { status: 500 })],
  ])('signOut keeps the user signed in when %s', async (_, respond) => {
    server.use(http.post(`${API}/api/auth/logout`, respond));
    signedIn();
    renderProvider();
    await screen.findByText('status: authenticated');

    await act(async () => {
      await expect(auth.signOut()).rejects.toThrow();
    });

    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
    expect(auth.user).toEqual(testUser);
  });

  it('useAuth throws outside the provider', () => {
    // React logs the thrown error; keep the test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside <AuthProvider>/);
  });
});
