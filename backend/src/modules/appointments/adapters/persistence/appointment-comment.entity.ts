import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('appointment_comments')
// The thread is always read whole and in order.
@Index(['appointmentId', 'createdAt'])
export class AppointmentCommentOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'appointment_id' }) appointmentId!: string;
  @Column('uuid', { name: 'author_id' }) authorId!: string;
  @Column('varchar', { length: 500 }) body!: string;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
}
