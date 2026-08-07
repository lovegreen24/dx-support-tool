import { useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './auth-context';

const SESSION_KEY = 'dx-support-tool.authenticated';
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  );

  const login = (password: string) => {
    if (password === DASHBOARD_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
