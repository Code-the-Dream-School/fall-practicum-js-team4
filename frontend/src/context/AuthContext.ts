import { createContext } from 'react';
import type { User } from '../services/authApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signedOutByUser: boolean;
  // True after the server said the session is no longer valid (any 401)
  sessionExpired: boolean;
  // Store the user returned by login/register; no need to call /me again
  setSession: (user: User) => void;
  signOut: () => Promise<void>;
  // Signs out locally after a 401, keeping "where you were" for after sign-in
  expireSession: () => void;
  clearSignedOutByUser: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
