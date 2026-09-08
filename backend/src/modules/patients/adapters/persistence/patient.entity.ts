import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { UserOrmEntity } from '../../../users/adapters/persistence/entities';

@Entity('patients')
export class PatientOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index({ unique: true }) @Column('uuid', { name: 'user_id' }) userId!: string;

  @ManyToOne(() => UserOrmEntity, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
  @Column('varchar', { length: 30, nullable: true }) phone!: string | null;
  @Column('date', { name: 'date_of_birth', nullable: true }) dateOfBirth!: string | null;
  @Column('varchar', { length: 255, nullable: true }) address!: string | null;
  @Column('varchar', { length: 50, name: 'insurance_number', nullable: true }) insuranceNumber!: string | null;
  @Column('text', { nullable: true }) notes!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
