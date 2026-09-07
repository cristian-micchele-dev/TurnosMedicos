import { api } from './client';

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

export const doctorsApi = {
  findAll: () => api.get<Doctor[]>('/doctors'),
  findOne: (id: string) => api.get<Doctor>(`/doctors/${id}`),
  me: () => api.get<Doctor>('/doctors/me'),
  create: (data: { userId: string; specialtyId: string; licenseNumber: string; phone?: string }) => api.post<Doctor>('/doctors', data),
  update: (id: string, data: { phone?: string; specialtyId?: string; active?: boolean }) => api.patch<Doctor>(`/doctors/${id}`, data),
  getAvailability: (id: string, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return api.get<Availability[]>(`/doctors/${id}/availability${query}`);
  },
  setAvailability: (id: string, slots: AvailabilitySlot[]) => api.put<Availability[]>(`/doctors/${id}/availability`, { slots }),
};
