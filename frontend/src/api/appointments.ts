import { api } from './client';
import type { PaginatedResponse } from './users';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  specialtyId: string;
  dateTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  cancellationReason: string | null;
  doctor?: { id: string; user?: { name: string }; specialty?: { name: string }; licenseNumber: string };
  patient?: { id: string; user?: { name: string } };
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  from?: string;
  to?: string;
}

export const appointmentsApi = {
  findAll: (filters?: AppointmentFilters, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    return api.get<PaginatedResponse<Appointment>>(`/appointments?${params.toString()}`);
  },
  findOne: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  create: (data: { doctorId: string; patientId: string; dateTime: string }) => api.post<Appointment>('/appointments', data),
  confirm: (id: string) => api.patch<Appointment>(`/appointments/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.patch<Appointment>(`/appointments/${id}/cancel`, { reason }),
  complete: (id: string) => api.patch<Appointment>(`/appointments/${id}/complete`),
};
