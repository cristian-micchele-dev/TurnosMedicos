import { useMemo, useState } from 'react';
import { auditApi, type AuditAction, type AuditEntry, type AuditFilters } from '../../api/audit';
import { usersApi, type PaginatedResponse, type UserListItem } from '../../api/users';
import { patientsApi, type Patient } from '../../api/patients';
import { useFetch } from '../../hooks/useFetch';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import styles from './AuditPage.module.css';

const ACTION_LABEL: Record<AuditAction, string> = {
  RECORD_ACCESS_GRANTED: 'Historia clínica abierta',
  RECORD_ACCESS_DENIED: 'Acceso denegado',
  APPOINTMENT_CANCELLED: 'Turno cancelado',
  USER_CREATED: 'Usuario creado',
  USER_ROLE_CHANGED: 'Cambio de rol',
  USER_PASSWORD_RESET: 'Contraseña reseteada',
  USER_ACTIVE_CHANGED: 'Alta o baja de usuario',
};

// Only a refused attempt is an alarm; everything else is the record of ordinary work.
const ACTION_VARIANT: Record<AuditAction, 'danger' | 'neutral'> = {
  RECORD_ACCESS_GRANTED: 'neutral',
  RECORD_ACCESS_DENIED: 'danger',
  APPOINTMENT_CANCELLED: 'neutral',
  USER_CREATED: 'neutral',
  USER_ROLE_CHANGED: 'neutral',
  USER_PASSWORD_RESET: 'neutral',
  USER_ACTIVE_CHANGED: 'neutral',
};

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', DOCTOR: 'Doctor', SECRETARY: 'Secretaría' };

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** The metadata read as a sentence; the raw JSON is for a machine, not for whoever audits. */
function describe(entry: AuditEntry): string {
  const { from, to, role, active, code } = entry.metadata;
  if (from && to) return `${from} → ${to}`;
  if (role) return `Rol ${role}`;
  if (active !== undefined && active !== null) return active ? 'Activado' : 'Desactivado';
  if (code) return String(code);
  return '—';
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({});

  const { data: result, loading } = useFetch<PaginatedResponse<AuditEntry>>(
    ['audit', page, filters.action ?? '', filters.from ?? '', filters.to ?? ''],
    () => auditApi.findAll(filters, page, 20),
  );

  // The trail stores identifiers, which is right for storage and useless to read.
  // Names are resolved here, where the admin already has access to both lists.
  const { data: users } = useFetch<PaginatedResponse<UserListItem>>(['users', 'audit'], () => usersApi.findAll(1, 100));
  const { data: patients } = useFetch<PaginatedResponse<Patient>>(['patients', 'audit'], () => patientsApi.findAll(1, 100));

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    users?.data.forEach((u) => map.set(u.id, u.name || u.email));
    patients?.data.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [users, patients]);

  const entries = result?.data ?? [];

  const setFilter = (patch: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const columns = [
    {
      key: 'occurredAt',
      header: 'Cuándo',
      width: '150px',
      render: (e: AuditEntry) => <span className={styles.when}>{formatWhen(e.occurredAt)}</span>,
    },
    {
      key: 'actor',
      header: 'Quién',
      render: (e: AuditEntry) => (
        <span className={styles.actor}>
          <span className={styles.actorName}>{(e.actorId && nameById.get(e.actorId)) ?? e.actorId ?? 'Sistema'}</span>
          {e.actorRole && <span className={styles.actorRole}>{ROLE_LABEL[e.actorRole] ?? e.actorRole}</span>}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Qué hizo',
      render: (e: AuditEntry) => (
        <Badge variant={ACTION_VARIANT[e.action] ?? 'neutral'} size="sm">{ACTION_LABEL[e.action] ?? e.action}</Badge>
      ),
    },
    {
      key: 'target',
      header: 'Sobre',
      render: (e: AuditEntry) => (
        <span className={styles.target}>{nameById.get(e.targetId) ?? e.targetId}</span>
      ),
    },
    {
      key: 'metadata',
      header: 'Detalle',
      render: (e: AuditEntry) => <span className={styles.detail}>{describe(e)}</span>,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Auditoría</h1>
          <p className={styles.subtitle}>
            Quién abrió cada historia clínica y quién cambió qué. El registro guarda el acto, nunca su contenido.
          </p>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Acción</span>
          <select
            className={styles.filterInput}
            value={filters.action ?? ''}
            onChange={(e) => setFilter({ action: (e.target.value || undefined) as AuditAction | undefined })}
          >
            <option value="">Todas</option>
            {(Object.keys(ACTION_LABEL) as AuditAction[]).map((action) => (
              <option key={action} value={action}>{ACTION_LABEL[action]}</option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Desde</span>
          <input
            className={styles.filterInput}
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilter({ from: e.target.value || undefined })}
          />
        </label>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Hasta</span>
          <input
            className={styles.filterInput}
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilter({ to: e.target.value || undefined })}
          />
        </label>
      </div>

      <Table
        columns={columns}
        data={entries}
        keyExtractor={(e) => e.id}
        loading={loading}
        total={result?.total}
        page={page}
        filtered={Boolean(filters.action || filters.from || filters.to)}
        empty={{
          title: 'Todavía no hay actividad registrada',
          description: 'Cada lectura de una historia clínica, cancelación o cambio de usuario va a aparecer acá.',
        }}
      />
      <Pagination page={page} totalPages={result?.totalPages ?? 1} onPageChange={setPage} />
    </div>
  );
}
