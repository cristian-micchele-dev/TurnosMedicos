import { api } from './client';
import type { PaginatedResponse } from './users';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  medications: Medication[];
  instructions: string | null;
  createdAt: string;
}

export interface CreatePrescriptionPayload {
  medications: Medication[];
  instructions?: string;
}

export const prescriptionsApi = {
  create: (appointmentId: string, data: CreatePrescriptionPayload) =>
    api.post<Prescription>(`/appointments/${appointmentId}/prescriptions`, data),

  findByAppointment: (appointmentId: string) =>
    api.get<Prescription[]>(`/appointments/${appointmentId}/prescriptions`),

  findByPatient: (patientId: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<Prescription>>(`/patients/${patientId}/prescriptions?page=${page}&limit=${limit}`),

  findOne: (id: string) =>
    api.get<Prescription>(`/prescriptions/${id}`),
};
