import { api } from './client';
import type { PaginatedResponse } from './users';

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  insuranceNumber: string | null;
  notes: string | null;
  active: boolean;
}

export interface PatientInput {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  insuranceNumber?: string;
  notes?: string;
}

export const patientsApi = {
  findAll: (page = 1, limit = 20) => api.get<PaginatedResponse<Patient>>(`/patients?page=${page}&limit=${limit}`),
  findOne: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: PatientInput) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<PatientInput> & { active?: boolean }) => api.patch<Patient>(`/patients/${id}`, data),
};
