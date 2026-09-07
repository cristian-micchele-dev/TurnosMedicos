import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('patients')
export class PatientOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index({ unique: true }) @Column('uuid', { name: 'user_id' }) userId!: string;
  @Column('varchar', { length: 30, nullable: true }) phone!: string | null;
  @Column('date', { name: 'date_of_birth', nullable: true }) dateOfBirth!: string | null;
  @Column('varchar', { length: 255, nullable: true }) address!: string | null;
  @Column('varchar', { length: 50, name: 'insurance_number', nullable: true }) insuranceNumber!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
