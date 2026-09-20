import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { AppointmentOrmEntity } from '../../../appointments/adapters/persistence/appointment.entity';
import { Medication } from '../../domain/prescription';

@Entity('prescriptions')
export class PrescriptionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'appointment_id', nullable: true }) appointmentId!: string;

  @Index()
  @Column('uuid', { name: 'doctor_id' }) doctorId!: string;

  @Index()
  @Column('uuid', { name: 'patient_id' }) patientId!: string;

  @Column({ type: 'jsonb', default: '[]' }) medications!: Medication[];

  @Column('text', { nullable: true }) instructions!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => AppointmentOrmEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: AppointmentOrmEntity | null;
}
