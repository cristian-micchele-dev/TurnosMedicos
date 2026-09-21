import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DOCTOR';
  mustChangePassword: boolean;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<UserProfile>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post<AuthResponse>('/auth/change-password', data),
  logout: () => api.post<void>('/auth/logout'),
  forgot: (email: string) => api.post<void>('/auth/forgot', { email }),
  reset: (token: string, password: string) =>
    api.post<void>('/auth/reset', { token, password }),
};
