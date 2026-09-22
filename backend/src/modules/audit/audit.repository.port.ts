import { AuditEntry, AuditAction } from './domain/audit-entry';

export interface AuditQuery {
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}

export interface AuditRepository {
  save(entry: AuditEntry): Promise<void>;
  findAll(query?: AuditQuery): Promise<[AuditEntry[], number]>;
}

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
