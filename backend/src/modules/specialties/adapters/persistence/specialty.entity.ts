import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('specialties')
export class SpecialtyOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index({ unique: true }) @Column('varchar', { length: 120 }) name!: string;
  @Column('text', { nullable: true }) description!: string | null;
  @Column('boolean', { default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
