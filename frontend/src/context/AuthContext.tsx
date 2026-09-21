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

const DEV_AUTO_LOGIN = false;
const DEV_CREDENTIALS = { email: 'admin@turno.med', password: 'Admin1234' };

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);

  const setUser = useCallback((user: UserProfile | null) => {
    setState({
      user,
      isLoading: false,
      isAuthenticated: user !== null,
    });
  }, []);

  const loginDirect = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await authApi.login({ email, password });
      localStorage.setItem('access_token', accessToken);
      const csrf = getCsrfFromCookie();
      if (csrf) localStorage.setItem('csrf_token', csrf);
      const profile = await authApi.me();
      setUser(profile);
    },
    [setUser],
  );

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      if (DEV_AUTO_LOGIN) {
        loginDirect(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password).catch(() =>
          setState({ user: null, isLoading: false, isAuthenticated: false }),
        );
        return;
      }
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('csrf_token');
        if (DEV_AUTO_LOGIN) {
          loginDirect(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password).catch(() =>
            setState({ user: null, isLoading: false, isAuthenticated: false }),
          );
          return;
        }
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, [setUser, loginDirect]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<void> => {
      const { accessToken } = await authApi.login({ email, password, rememberMe });

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

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('csrf_token');
      setUser(null);
    }
  }, [setUser]);

  // The backend revokes every session and issues a fresh pair, so we swap tokens in place.
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      const { accessToken } = await authApi.changePassword({ currentPassword, newPassword });
      localStorage.setItem('access_token', accessToken);
      const csrf = getCsrfFromCookie();
      if (csrf) localStorage.setItem('csrf_token', csrf);
      setUser(await authApi.me());
    },
    [setUser],
  );

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    changePassword,
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
