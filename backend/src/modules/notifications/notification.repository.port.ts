import { Notification } from './domain/notification';

export interface NotificationQuery {
  unreadOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | undefined>;
  findByUser(userId: string, query?: NotificationQuery): Promise<[Notification[], number]>;
  countUnread(userId: string): Promise<number>;
  markAllRead(userId: string, at: Date): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
