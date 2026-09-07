import { api } from './client';

export interface UserListItem {
  id: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

export const usersApi = {
  findAll: () => api.get<UserListItem[]>('/users'),
  create: (data: CreateUserRequest) => api.post<UserListItem>('/users', data),
  updateRole: (id: string, role: string) => api.patch<UserListItem>(`/users/${id}/role`, { role }),
  toggleActive: (id: string) => api.patch<UserListItem>(`/users/${id}/toggle-active`),
};
