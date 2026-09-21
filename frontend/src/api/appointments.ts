import { api } from './client';
import type { PaginatedResponse } from './users';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  code: string;
  doctorId: string;
  patientId: string;
  specialtyId: string;
  dateTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  diagnosis: string | null;
  cancellationReason: string | null;
  doctor?: { id: string; licenseNumber: string; user?: { id: string; email: string; name: string }; specialty?: { id: string; name: string } };
  patient?: { id: string; name: string; email: string | null };
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  from?: string;
  to?: string;
  code?: string;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD on the clinic clock
  status: AppointmentStatus;
  count: number;
}

export const appointmentsApi = {
  summary: (from: string, to: string) => api.get<DaySummary[]>(`/appointments/summary?from=${from}&to=${to}`),
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
  complete: (id: string, data?: { diagnosis?: string; notes?: string }) => api.patch<Appointment>(`/appointments/${id}/complete`, data),
  reschedule: (id: string, dateTime: string) => api.patch<Appointment>(`/appointments/${id}/reschedule`, { dateTime }),
};
