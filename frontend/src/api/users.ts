import { api } from './client';

export interface UserListItem {
  id: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  active: boolean;
  createdAt: string;
}

export const usersApi = {
  findAll: () => api.get<UserListItem[]>('/users'),
  updateRole: (id: string, role: string) => api.patch<UserListItem>(`/users/${id}/role`, { role }),
  toggleActive: (id: string) => api.patch<UserListItem>(`/users/${id}/toggle-active`),
};
