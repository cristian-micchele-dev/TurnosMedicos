import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { AppointmentOrmEntity } from '../../../appointments/adapters/persistence/appointment.entity';

@Entity('medical_reports')
export class MedicalReportOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'appointment_id', nullable: true }) appointmentId!: string | null;

  @Index()
  @Column('uuid', { name: 'doctor_id' }) doctorId!: string;

  @Index()
  @Column('uuid', { name: 'patient_id' }) patientId!: string;

  @Column('varchar', { length: 255 }) title!: string;

  @Column('text', { nullable: true }) description!: string | null;

  @Column('varchar', { length: 255, name: 'file_name' }) fileName!: string;

  @Column('varchar', { length: 255, name: 'original_name' }) originalName!: string;

  @Column('varchar', { length: 100, name: 'mime_type' }) mimeType!: string;

  @Column('integer', { name: 'size_bytes' }) sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => AppointmentOrmEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: AppointmentOrmEntity | null;
}
