import { api } from './client';

export interface Specialty {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export const specialtiesApi = {
  findAll: () => api.get<Specialty[]>('/specialties'),
  findOne: (id: string) => api.get<Specialty>(`/specialties/${id}`),
  create: (data: { name: string; description?: string }) => api.post<Specialty>('/specialties', data),
  update: (id: string, data: { name?: string; description?: string }) => api.patch<Specialty>(`/specialties/${id}`, data),
  remove: (id: string) => api.delete<void>(`/specialties/${id}`),
};
