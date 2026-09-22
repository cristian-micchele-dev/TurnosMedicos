import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { NotificationType } from '../../domain/notification';

@Entity('notifications')
// The inbox query is always "mine, newest first", so the index matches it.
@Index(['userId', 'createdAt'])
export class NotificationOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('varchar', { length: 40 }) type!: NotificationType;
  @Column('varchar', { length: 240 }) message!: string;
  @Column('uuid', { name: 'appointment_id', nullable: true }) appointmentId!: string | null;
  @Column('timestamptz', { name: 'read_at', nullable: true }) readAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
