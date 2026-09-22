import { Role } from '../../users/domain/user';

/**
 * What happened, who did it and sobre quién. Never *what it said*.
 *
 * An audit trail that copies the diagnosis into itself turns one sensitive
 * table into two. Entries carry identifiers and outcomes, so reading the log
 * tells you that someone opened a chart — not what the chart contained.
 */
export enum AuditAction {
  /** Someone was allowed to read a patient's chart (reports, prescriptions). */
  RECORD_ACCESS_GRANTED = 'RECORD_ACCESS_GRANTED',
  /** Someone tried and was refused. The attempt is the interesting part. */
  RECORD_ACCESS_DENIED = 'RECORD_ACCESS_DENIED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  USER_CREATED = 'USER_CREATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  USER_ACTIVE_CHANGED = 'USER_ACTIVE_CHANGED',
}

export type AuditMetadata = Record<string, string | number | boolean | null>;

export class AuditEntry {
  constructor(
    public readonly id: string,
    public readonly occurredAt: Date,
    /** The account that acted. Null only for actions the system takes on its own. */
    public readonly actorId: string | null,
    public readonly actorRole: Role | null,
    public readonly action: AuditAction,
    /** What was acted upon: 'patient', 'appointment', 'user'. */
    public readonly targetType: string,
    public readonly targetId: string,
    public readonly metadata: AuditMetadata = {},
  ) {}

  toPublic() {
    return {
      id: this.id,
      occurredAt: this.occurredAt.toISOString(),
      actorId: this.actorId,
      actorRole: this.actorRole,
      action: this.action,
      targetType: this.targetType,
      targetId: this.targetId,
      metadata: this.metadata,
    };
  }
}
