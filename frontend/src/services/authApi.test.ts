import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, server, signedIn, testPassword, testUser } from '../test/server';
import { getCurrentUser, login, logout } from './authApi';

describe('authApi', () => {
  it('login returns the user', async () => {
    await expect(
      login({
        email: testUser.email,
        password: testPassword,
        rememberMe: true,
      }),
    ).resolves.toEqual(testUser);
  });

  it('getCurrentUser returns the signed-in user', async () => {
    signedIn();
    await expect(getCurrentUser()).resolves.toEqual(testUser);
  });

  it('logout succeeds', async () => {
    await expect(logout()).resolves.toBeNull();
  });

  it.each([
    ['login', '/api/auth/login', 'post'],
    ['getCurrentUser', '/api/auth/me', 'get'],
  ] as const)(
    '%s rejects a success response without a user',
    async (name, path, method) => {
      server.use(
        http[method](`${API}${path}`, () =>
          HttpResponse.json({ success: true, data: {} }),
        ),
      );
      const call =
        name === 'login'
          ? login({ email: 'a@b.co', password: 'x', rememberMe: true })
          : getCurrentUser();

      await expect(call).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    },
  );
});
