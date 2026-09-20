import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { UserOrmEntity } from '../../../users/adapters/persistence/entities';
import { SpecialtyOrmEntity } from '../../../specialties/adapters/persistence/specialty.entity';

@Entity('doctors')
export class DoctorOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index({ unique: true }) @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('uuid', { name: 'specialty_id' }) specialtyId!: string;
  @Index({ unique: true }) @Column('varchar', { length: 50, name: 'license_number' }) licenseNumber!: string;
  @Column('varchar', { length: 30, nullable: true }) phone!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => UserOrmEntity, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @ManyToOne(() => SpecialtyOrmEntity, { eager: false })
  @JoinColumn({ name: 'specialty_id' })
  specialty?: SpecialtyOrmEntity;
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

@Entity('schedule_blocks')
export class ScheduleBlockOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid', { name: 'doctor_id' }) doctorId!: string;
  @Column('timestamptz', { name: 'start_date' }) startDate!: Date;
  @Column('timestamptz', { name: 'end_date' }) endDate!: Date;
  @Column('varchar', { length: 255, nullable: true }) reason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
