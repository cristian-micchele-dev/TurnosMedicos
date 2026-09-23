import { api } from './client';

export const MAX_COMMENT_LENGTH = 500;

export interface AppointmentComment {
  id: string;
  appointmentId: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

export const commentsApi = {
  list: (appointmentId: string) => api.get<AppointmentComment[]>(`/appointments/${appointmentId}/comments`),
  add: (appointmentId: string, body: string) =>
    api.post<AppointmentComment>(`/appointments/${appointmentId}/comments`, { body }),
};
