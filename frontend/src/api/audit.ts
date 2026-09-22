import { api } from './client';
import type { PaginatedResponse } from './users';

export type AuditAction =
  | 'RECORD_ACCESS_GRANTED'
  | 'RECORD_ACCESS_DENIED'
  | 'APPOINTMENT_CANCELLED'
  | 'USER_CREATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PASSWORD_RESET'
  | 'USER_ACTIVE_CHANGED';

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorRole: 'ADMIN' | 'DOCTOR' | 'SECRETARY' | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface AuditFilters {
  action?: AuditAction;
  from?: string;
  to?: string;
}

export const auditApi = {
  findAll: (filters: AuditFilters = {}, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.action) params.set('action', filters.action);
    if (filters.from) params.set('from', `${filters.from}T00:00:00.000Z`);
    if (filters.to) params.set('to', `${filters.to}T23:59:59.999Z`);
    return api.get<PaginatedResponse<AuditEntry>>(`/audit?${params}`);
  },
};
