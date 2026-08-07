import { createContext } from 'react';

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
