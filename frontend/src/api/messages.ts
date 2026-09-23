import { api } from './client';

export const MAX_MESSAGE_LENGTH = 1000;

export interface Contact {
  id: string;
  name: string;
  role: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  counterpart: Contact;
  lastMessage: Message;
  unread: number;
}

export interface Thread {
  counterpart: Contact;
  data: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const messagesApi = {
  conversations: () => api.get<Conversation[]>('/messages/conversations'),
  contacts: () => api.get<Contact[]>('/messages/contacts'),
  unread: () => api.get<{ unread: number }>('/messages/unread'),
  thread: (userId: string) => api.get<Thread>(`/messages/${userId}`),
  send: (userId: string, body: string) => api.post<Message>(`/messages/${userId}`, { body }),
};
