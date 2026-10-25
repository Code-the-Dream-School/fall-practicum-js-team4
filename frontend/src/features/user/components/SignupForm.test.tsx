import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '../../../context/AuthProvider';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testPassword,
  testUser,
} from '../../../test/server';
import { SignupForm } from './SignupForm';

const setup = () => {
  const user = userEvent.setup();

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<SignupForm />} />
          <Route path="/dashboard" element={<p>Dashboard reached</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  return user;
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText(/full name/i), testUser.name);
  await user.type(screen.getByLabelText(/email address/i), testUser.email);
  await user.type(screen.getByLabelText(/^password$/i), testPassword);
  await user.type(screen.getByLabelText(/confirm password/i), testPassword);
};

const submit = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: /create account/i }));

describe('SignupForm', () => {
  it('redirects an already signed-in user away from signup', async () => {
    signedIn();
    setup();

    expect(await screen.findByText('Dashboard reached')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /create account/i }),
    ).not.toBeInTheDocument();
  });

  it('requires all four fields', async () => {
    const user = setup();

    await submit(user);

    expect(
      await screen.findByText('Full name is required'),
    ).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(
      screen.getByText('Please confirm your password'),
    ).toBeInTheDocument();
  });

  it('rejects passwords that do not match', async () => {
    const user = setup();
    await fillForm(user);

    const confirm = screen.getByLabelText(/confirm password/i);
    await user.clear(confirm);
    await user.type(confirm, 'different-password');

    await submit(user);

    expect(
      await screen.findByText('Passwords do not match'),
    ).toBeInTheDocument();
  });

  it('creates an account successfully', async () => {
    let requestBody: unknown;

    server.use(
      http.post(`${API}/api/auth/register`, async ({ request }) => {
        requestBody = await request.json();

        return HttpResponse.json(
          { success: true, data: { user: testUser } },
          { status: 201 },
        );
      }),
    );

    const user = setup();
    await fillForm(user);
    await submit(user);

    expect(
      await screen.findByText('Account created successfully'),
    ).toBeInTheDocument();

    expect(requestBody).toEqual({
      name: testUser.name,
      email: testUser.email,
      password: testPassword,
    });

    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeDisabled();

    expect(
      await screen.findByText('Dashboard reached', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('shows an error for an existing email', async () => {
    server.use(
      http.post(`${API}/api/auth/register`, () =>
        errorResponse(409, 'EMAIL_EXISTS'),
      ),
    );

    const user = setup();
    await fillForm(user);
    await submit(user);

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument();
  });

  it('displays backend field validation errors', async () => {
    server.use(
      http.post(`${API}/api/auth/register`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: [{ field: 'email', message: 'Email rejected by server' }],
          },
          { status: 400 },
        ),
      ),
    );

    const user = setup();
    await fillForm(user);
    await submit(user);

    expect(
      await screen.findByText('Email rejected by server'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('explains when the server cannot be reached', async () => {
    server.use(
      http.post(`${API}/api/auth/register`, () => HttpResponse.error()),
    );

    const user = setup();
    await fillForm(user);
    await submit(user);

    expect(
      await screen.findByText(/could not reach the server/i),
    ).toBeInTheDocument();
  });
});
