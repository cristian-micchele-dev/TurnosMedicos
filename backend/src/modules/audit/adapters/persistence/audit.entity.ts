import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { AuditAction, AuditMetadata } from '../../domain/audit-entry';
import { Role } from '../../../users/domain/user';

@Entity('audit_log')
export class AuditLogOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Index() @Column('timestamptz', { name: 'occurred_at' }) occurredAt!: Date;
  // No FK to users on purpose: the trail must survive the account being deleted.
  @Index() @Column('uuid', { name: 'actor_id', nullable: true }) actorId!: string | null;
  @Column('varchar', { length: 20, name: 'actor_role', nullable: true }) actorRole!: Role | null;
  @Index() @Column('varchar', { length: 40 }) action!: AuditAction;
  @Column('varchar', { length: 20, name: 'target_type' }) targetType!: string;
  @Index() @Column('varchar', { length: 64, name: 'target_id' }) targetId!: string;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) metadata!: AuditMetadata;
}
