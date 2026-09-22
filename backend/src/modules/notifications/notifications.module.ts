import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationController } from './adapters/http/notification.controller';
import { NotificationService } from './application/notification.service';
import { TypeOrmNotificationRepository } from './adapters/persistence/typeorm-notification.repository';
import { NOTIFICATION_REPOSITORY } from './notification.repository.port';
import { NotificationOrmEntity } from './adapters/persistence/notification.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NotificationOrmEntity])],
  controllers: [NotificationController],
  providers: [
    NotificationsGateway,
    NotificationService,
    TypeOrmNotificationRepository,
    { provide: NOTIFICATION_REPOSITORY, useExisting: TypeOrmNotificationRepository },
  ],
  exports: [NotificationsGateway, NotificationService],
})
export class NotificationsModule {}
