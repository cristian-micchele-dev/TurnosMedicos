import { api } from './client';
import type { PaginatedResponse } from './users';

export interface Patient {
  id: string;
  userId: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  insuranceNumber: string | null;
  notes: string | null;
  active: boolean;
  user?: { id: string; email: string; name: string };
}

export const patientsApi = {
  findAll: (page = 1, limit = 20) => api.get<PaginatedResponse<Patient>>(`/patients?page=${page}&limit=${limit}`),
  findOne: (id: string) => api.get<Patient>(`/patients/${id}`),
  me: () => api.get<Patient>('/patients/me'),
  create: (data: { userId: string; phone?: string; dateOfBirth?: string; address?: string; insuranceNumber?: string; notes?: string }) => api.post<Patient>('/patients', data),
  update: (id: string, data: { phone?: string; dateOfBirth?: string; address?: string; insuranceNumber?: string; notes?: string; active?: boolean }) => api.patch<Patient>(`/patients/${id}`, data),
};
