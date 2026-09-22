import { api } from './client';

export type NotificationType =
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'appointment_rescheduled';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  appointmentId: string | null;
  read: boolean;
  createdAt: string;
}

export interface Inbox {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unread: number;
}

export const notificationsApi = {
  inbox: (limit = 20) => api.get<Inbox>(`/notifications?page=1&limit=${limit}`),
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<void>('/notifications/read-all'),
};
