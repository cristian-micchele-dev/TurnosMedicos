import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationRepository, NotificationQuery } from '../../notification.repository.port';
import { Notification } from '../../domain/notification';
import { NotificationOrmEntity } from './notification.entity';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(@InjectRepository(NotificationOrmEntity) private readonly repo: Repository<NotificationOrmEntity>) {}

  private map(e: NotificationOrmEntity): Notification {
    return new Notification(e.id, e.userId, e.type, e.message, e.appointmentId, e.readAt, e.createdAt);
  }

  async save(n: Notification): Promise<void> {
    await this.repo.insert({
      id: n.id,
      userId: n.userId,
      type: n.type,
      message: n.message,
      appointmentId: n.appointmentId,
      readAt: n.readAt,
      createdAt: n.createdAt,
    });
  }

  async update(n: Notification): Promise<void> {
    await this.repo.update(n.id, { readAt: n.readAt });
  }

  async findById(id: string): Promise<Notification | undefined> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }

  async findByUser(userId: string, query: NotificationQuery = {}): Promise<[Notification[], number]> {
    const [rows, total] = await this.repo.findAndCount({
      where: { userId, ...(query.unreadOnly ? { readAt: IsNull() } : {}) },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return [rows.map((r) => this.map(r)), total];
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, readAt: IsNull() } });
  }

  async markAllRead(userId: string, at: Date): Promise<void> {
    await this.repo.update({ userId, readAt: IsNull() }, { readAt: at });
  }
}
