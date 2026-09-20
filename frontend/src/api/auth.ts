import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DOCTOR';
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<UserProfile>('/auth/me'),
  logout: () => api.post<void>('/auth/logout'),
  forgot: (email: string) => api.post<void>('/auth/forgot', { email }),
  reset: (token: string, password: string) =>
    api.post<void>('/auth/reset', { token, password }),
};
