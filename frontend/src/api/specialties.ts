import { api } from './client';
import type { PaginatedResponse } from './users';

export interface Specialty {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export const specialtiesApi = {
  findAll: (page = 1, limit = 20) => api.get<PaginatedResponse<Specialty>>(`/specialties?page=${page}&limit=${limit}`),
  findOne: (id: string) => api.get<Specialty>(`/specialties/${id}`),
  create: (data: { name: string; description?: string }) => api.post<Specialty>('/specialties', data),
  update: (id: string, data: { name?: string; description?: string }) => api.patch<Specialty>(`/specialties/${id}`, data),
  remove: (id: string) => api.delete<void>(`/specialties/${id}`),
};
