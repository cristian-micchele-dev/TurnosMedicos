import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('patients')
export class PatientOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column('varchar', { length: 120 }) name!: string;
  @Column('varchar', { length: 255, nullable: true }) email!: string | null;
  @Column('varchar', { length: 30, nullable: true }) phone!: string | null;
  @Column('date', { name: 'date_of_birth', nullable: true }) dateOfBirth!: string | null;
  @Column('varchar', { length: 255, nullable: true }) address!: string | null;
  @Column('varchar', { length: 50, name: 'insurance_number', nullable: true }) insuranceNumber!: string | null;
  @Column('text', { nullable: true }) notes!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
