import { createContext } from 'react';
import type { User } from '../services/authApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  // Store the user returned by login/register; no need to call /me again
  setSession: (user: User) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
