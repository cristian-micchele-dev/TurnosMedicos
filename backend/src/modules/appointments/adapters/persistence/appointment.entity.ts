import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { AppointmentStatus } from '../../domain/appointment-status.enum';

@Entity('appointments')
export class AppointmentOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index() @Column('uuid', { name: 'doctor_id' }) doctorId!: string;
  @Index() @Column('uuid', { name: 'patient_id' }) patientId!: string;
  @Column('uuid', { name: 'specialty_id' }) specialtyId!: string;
  @Index() @Column('timestamptz', { name: 'date_time' }) dateTime!: Date;
  @Column('smallint', { name: 'duration_minutes', default: 30 }) durationMinutes!: number;
  @Column('enum', { enum: AppointmentStatus, default: AppointmentStatus.PENDING }) status!: AppointmentStatus;
  @Column('text', { nullable: true }) notes!: string | null;
  @Column('text', { name: 'cancellation_reason', nullable: true }) cancellationReason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
