import { api } from './client';

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DOCTOR' | 'SECRETARY';
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role: 'ADMIN' | 'DOCTOR' | 'SECRETARY';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  findAll: (page = 1, limit = 20) => api.get<PaginatedResponse<UserListItem>>(`/users?page=${page}&limit=${limit}`),
  create: (data: CreateUserRequest) => api.post<UserListItem>('/users', data),
  updateRole: (id: string, role: string) => api.patch<UserListItem>(`/users/${id}/role`, { role }),
  toggleActive: (id: string) => api.patch<UserListItem>(`/users/${id}/toggle-active`),
  resetPassword: (id: string) => api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
};
