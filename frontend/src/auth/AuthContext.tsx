import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { authApi } from '../api/auth';
import type { AuthContextValue, AuthState, UserProfile } from './AuthContext.types';

function getCsrfFromCookie(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));
  return match ? match.split('=')[1] : null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);

  const setUser = useCallback((user: UserProfile | null) => {
    setState({
      user,
      isLoading: false,
      isAuthenticated: user !== null,
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('csrf_token');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, [setUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { accessToken } = await authApi.login({ email, password });

      localStorage.setItem('access_token', accessToken);

      const csrf = getCsrfFromCookie();
      if (csrf) {
        localStorage.setItem('csrf_token', csrf);
      }

      const profile = await authApi.me();
      setUser(profile);
    },
    [setUser],
  );

  const register = useCallback(
    async (email: string, password: string, name: string): Promise<void> => {
      await authApi.register({ email, password, name });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('csrf_token');
      setUser(null);
    }
  }, [setUser]);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
