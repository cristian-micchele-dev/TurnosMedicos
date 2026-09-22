import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Notification, NotificationType } from '../domain/notification';
import { NotificationRepository, NotificationQuery, NOTIFICATION_REPOSITORY } from '../notification.repository.port';
import { NotificationsGateway } from '../notifications.gateway';
import { Clock, CLOCK } from '../../../shared/application/ports';
import { ForbiddenError } from '../../../shared/domain/errors';
import { NotificationNotFoundError } from '../domain/notification-not-found.exception';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() private readonly gateway?: NotificationsGateway,
  ) {}

  /**
   * Stores it, then tries to push it.
   *
   * The row is the notification; the socket is only how it arrives early. A
   * doctor who was not connected still finds it waiting, and a socket that
   * fails never costs the notification.
   */
  async notify(userId: string, type: NotificationType, message: string, appointmentId: string | null = null): Promise<void> {
    const notification = new Notification(randomUUID(), userId, type, message, appointmentId, null, this.clock.now());
    await this.notifications.save(notification);
    try {
      this.gateway?.notifyUser(userId, 'notification', notification.toPublic());
    } catch (error) {
      this.logger.warn(`Notificación ${notification.id} guardada pero no emitida`, error as Error);
    }
  }

  async inbox(userId: string, query: NotificationQuery & { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [list, total] = await this.notifications.findByUser(userId, {
      unreadOnly: query.unreadOnly,
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: list.map((n) => n.toPublic()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unread: await this.notifications.countUnread(userId),
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    const notification = await this.notifications.findById(id);
    if (!notification) throw new NotificationNotFoundError(id);
    // Someone else's notification is not yours to read, not even to dismiss.
    if (notification.userId !== userId) throw new ForbiddenError();
    if (notification.read) return;
    notification.markRead(this.clock.now());
    await this.notifications.update(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.markAllRead(userId, this.clock.now());
  }
}
