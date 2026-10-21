import { ApiError, apiRequest } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
  // false: signed out when the browser closes
  rememberMe: boolean;
}

// A "success" without a user would leave the app signed in as nobody
const userFrom = (data: { user?: User } | null) => {
  if (!data?.user) {
    throw new ApiError(
      500,
      'INTERNAL_ERROR',
      'Unexpected response from the server.',
    );
  }
  return data.user;
};

export const login = async (input: LoginInput) =>
  userFrom(
    await apiRequest<{ user?: User }>('/api/auth/login', {
      method: 'POST',
      body: input,
    }),
  );

export const getCurrentUser = async () =>
  userFrom(await apiRequest<{ user?: User }>('/api/auth/me'));

export const logout = () =>
  apiRequest<null>('/api/auth/logout', { method: 'POST' });
