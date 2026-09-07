import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('doctors')
export class DoctorOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index({ unique: true }) @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('uuid', { name: 'specialty_id' }) specialtyId!: string;
  @Index({ unique: true }) @Column('varchar', { length: 50, name: 'license_number' }) licenseNumber!: string;
  @Column('varchar', { length: 30, nullable: true }) phone!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('availabilities')
@Unique(['doctorId', 'dayOfWeek', 'startTime'])
export class AvailabilityOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'doctor_id' }) doctorId!: string;
  @Column('smallint', { name: 'day_of_week' }) dayOfWeek!: number;
  @Column('time', { name: 'start_time' }) startTime!: string;
  @Column('time', { name: 'end_time' }) endTime!: string;
  @Column('smallint', { name: 'slot_duration_minutes', default: 30 }) slotDurationMinutes!: number;
}
