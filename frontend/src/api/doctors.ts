import { api } from './client';
import type { PaginatedResponse } from './users';

export interface Doctor {
  id: string;
  userId: string;
  specialtyId: string;
  licenseNumber: string;
  phone: string | null;
  active: boolean;
  user?: { id: string; email: string; name: string };
  specialty?: { id: string; name: string };
}

export interface Availability {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0=sunday ... 6=saturday
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDuration: number; // minutes
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface ScheduleBlock {
  id: string;
  doctorId: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  reason: string | null;
  createdAt: string;
}

export interface CreateScheduleBlockDto {
  startDate: string; // ISO
  endDate: string;   // ISO
  reason?: string;
}

export const doctorsApi = {
  findAll: (page = 1, limit = 20) => api.get<PaginatedResponse<Doctor>>(`/doctors?page=${page}&limit=${limit}`),
  findOne: (id: string) => api.get<Doctor>(`/doctors/${id}`),
  me: () => api.get<Doctor>('/doctors/me'),
  create: (data: { userId: string; specialtyId: string; licenseNumber: string; phone?: string }) => api.post<Doctor>('/doctors', data),
  update: (id: string, data: { phone?: string; specialtyId?: string; active?: boolean }) => api.patch<Doctor>(`/doctors/${id}`, data),
  getAvailability: (id: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return api.get<Availability[]>(`/doctors/${id}/availability${query}`);
  },
  setAvailability: (id: string, slots: AvailabilitySlot[]) => api.post<Availability[]>(`/doctors/${id}/availability`, { slots }),
  getBlocks: (id: string) => api.get<ScheduleBlock[]>(`/doctors/${id}/blocks`),
  addBlock: (id: string, dto: CreateScheduleBlockDto) => api.post<ScheduleBlock>(`/doctors/${id}/blocks`, dto),
  removeBlock: (id: string, blockId: string) => api.delete<void>(`/doctors/${id}/blocks/${blockId}`),
};
