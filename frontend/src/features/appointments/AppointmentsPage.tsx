import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  appointmentsApi,
  type Appointment,
  type AppointmentFilters,
  type AppointmentStatus,
} from '../../api/appointments';
import { specialtiesApi } from '../../api/specialties';
import type { PaginatedResponse } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AgendaViewSwitch } from '../agenda/AgendaViewSwitch';
import styles from './AppointmentsPage.module.css';
import { apiErrorMessage } from '../../api/client';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; variant: 'warning' | 'primary' | 'danger' | 'success' }
> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  CONFIRMED: { label: 'Confirmado', variant: 'primary' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
  COMPLETED: { label: 'Completado', variant: 'success' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'COMPLETED', label: 'Completado' },
];

export function AppointmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Filters live in the URL: dashboard cards deep-link here, reloads keep them, links are shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchText = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const specialtyFilter = searchParams.get('specialty') ?? '';
  const fromDate = searchParams.get('from') ?? '';
  const toDate = searchParams.get('to') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  // react-router's functional setSearchParams reads the params of the current render, not the previous
  // call's result — so never issue two updates in one handler; a filter change also resets the page here.
  const setParam = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  const setSearchText = (v: string) => setParam('q', v);
  const setStatusFilter = (v: string) => setParam('status', v);
  const setSpecialtyFilter = (v: string) => setParam('specialty', v);
  const setFromDate = (v: string) => setParam('from', v);
  const setToDate = (v: string) => setParam('to', v);
  const setPage = (p: number) => setParam('page', p > 1 ? String(p) : '');

  const { data: specialtiesResult } = useFetch(
    ['specialties', 'all'],
    () => specialtiesApi.findAll(1, 100),
  );
  const specialtyOptions = useMemo(() => {
    const base = [{ value: '', label: 'Todas las especialidades' }];
    const fetched = (specialtiesResult?.data ?? []).map((s) => ({ value: s.name, label: s.name }));
    return [...base, ...fetched];
  }, [specialtiesResult]);

  const { data: result, loading, refetch: refetchAppointments } = useFetch<PaginatedResponse<Appointment>>(
    ['appointments', 'list', statusFilter, fromDate, toDate, page],
    () => {
      const filters: AppointmentFilters = {};
      if (statusFilter) filters.status = statusFilter as AppointmentStatus;
      if (fromDate) filters.from = fromDate;
      if (toDate) filters.to = toDate;
      return appointmentsApi.findAll(filters, page);
    },
  );

  const allAppointments = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  const appointments = useMemo(() => {
    let list = allAppointments;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.code ?? '').toLowerCase().includes(q) ||
          (a.doctor?.user?.name ?? '').toLowerCase().includes(q) ||
          (a.patient?.name ?? '').toLowerCase().includes(q),
      );
    }
    if (specialtyFilter) {
      list = list.filter(
        (a) => (a.doctor?.specialty?.name ?? '') === specialtyFilter,
      );
    }
    return list;
  }, [allAppointments, searchText, specialtyFilter]);

  const handleAction = async (
    action: 'confirm' | 'cancel' | 'complete',
    appointment: Appointment,
    reason?: string,
    completeData?: { diagnosis?: string; notes?: string },
  ) => {
    setPendingId(appointment.id);
    try {
      if (action === 'confirm') {
        await appointmentsApi.confirm(appointment.id);
        toast.success(`Turno ${appointment.code} confirmado`);
      } else if (action === 'cancel') {
        await appointmentsApi.cancel(appointment.id, reason);
        toast.success(`Turno ${appointment.code} cancelado`);
      } else {
        await appointmentsApi.complete(appointment.id, completeData);
        toast.success(`Turno ${appointment.code} completado`);
      }
      setSelectedAppointment(null);
      await refetchAppointments();
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo actualizar el turno ${appointment.code}`));
    } finally {
      setPendingId(null);
    }
  };

  const role = user?.role;
  const canCreate = role === 'ADMIN' || role === 'DOCTOR' || role === 'SECRETARY';

  const renderActions = (appt: Appointment) => {
    const { status } = appt;
    const busy = pendingId === appt.id;
    const buttons: React.ReactNode[] = [];

    // The front desk works the schedule like an admin, minus marking a visit as attended.
    if (role === 'ADMIN' || role === 'SECRETARY') {
      if (status === 'PENDING') {
        buttons.push(
          <Button
            key="confirm"
            variant="ghost"
            size="sm"
            isLoading={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleAction('confirm', appt);
            }}
          >
            Confirmar
          </Button>,
        );
      }
      if (status !== 'CANCELLED' && status !== 'COMPLETED') {
        buttons.push(
          <Button
            key="cancel"
            variant="ghost"
            size="sm"
            className={styles.dangerBtn}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAppointment(appt);
            }}
          >
            Cancelar
          </Button>,
        );
      }
      if (status === 'CONFIRMED' && role === 'ADMIN') {
        buttons.push(
          <Button
            key="complete"
            variant="ghost"
            size="sm"
            isLoading={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleAction('complete', appt);
            }}
          >
            Completar
          </Button>,
        );
      }
    } else if (role === 'DOCTOR') {
      if (status === 'PENDING') {
        buttons.push(
          <Button
            key="confirm"
            variant="ghost"
            size="sm"
            isLoading={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleAction('confirm', appt);
            }}
          >
            Confirmar
          </Button>,
        );
      }
      if (status === 'CONFIRMED') {
        buttons.push(
          <Button
            key="complete"
            variant="ghost"
            size="sm"
            isLoading={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleAction('complete', appt);
            }}
          >
            Completar
          </Button>,
        );
      }
    }

    return <div className={styles.actions}>{buttons}</div>;
  };

  const columns = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      width: '110px',
      render: (a: Appointment) => (
        <span className={styles.codeCell}>{a.code}</span>
      ),
    },
    {
      key: 'dateTime',
      header: 'Fecha / Hora',
      sortable: true,
      render: (a: Appointment) => (
        <span className={styles.dateCell}>{formatDateTime(a.dateTime)}</span>
      ),
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (a: Appointment) => (
        <span className={styles.nameCell}>{a.patient?.name ?? '—'}</span>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (a: Appointment) => (
        <span className={styles.nameCell}>{a.doctor?.user?.name ?? '—'}</span>
      ),
    },
    {
      key: 'specialty',
      header: 'Especialidad',
      render: (a: Appointment) => (
        <span className={styles.secondaryCell}>{a.doctor?.specialty?.name ?? '—'}</span>
      ),
    },
    {
      key: 'durationMinutes',
      header: 'Duración',
      width: '100px',
      render: (a: Appointment) => (
        <span className={styles.secondaryCell}>{a.durationMinutes} min</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '140px',
      render: (a: Appointment) => {
        const cfg = STATUS_CONFIG[a.status];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      hideUntilHover: true,
      align: 'right' as const,
      width: '200px',
      render: renderActions,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{role === 'DOCTOR' ? 'Mi Agenda' : 'Turnos'}</h1>
          <p className={styles.subtitle}>
            {role === 'DOCTOR' ? 'Todos tus turnos, para buscar y filtrar' : 'Gestión de turnos'}
          </p>
        </div>
        <div className={styles.headerActions}>
          {role === 'DOCTOR' && <AgendaViewSwitch />}
          {canCreate && (
            <Button variant="primary" onClick={() => navigate('/nuevo-turno')}>
              + Nuevo Turno
            </Button>
          )}
        </div>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <svg
              className={styles.searchIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder={role === 'DOCTOR' ? 'Buscar por código o paciente…' : 'Buscar por código, paciente o doctor…'}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtersRow}>
          <div className={styles.filterField}>
            <Select
              label="Estado"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Todos los estados"
            />
          </div>
          {(role === 'ADMIN' || role === 'SECRETARY') && (
            <div className={styles.filterField}>
              <Select
                label="Especialidad"
                options={specialtyOptions}
                value={specialtyFilter}
                onChange={(v) => setSpecialtyFilter(v)}
                placeholder="Todas las especialidades"
              />
            </div>
          )}
          <div className={styles.filterFieldDate}>
            <Input
              label="Desde"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className={styles.filterFieldDate}>
            <Input
              label="Hasta"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {(searchText || statusFilter || specialtyFilter || fromDate || toDate) && (
            <div className={styles.clearFilter}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <Table
          columns={columns}
          data={appointments}
          keyExtractor={(a) => a.id}
          loading={loading}
          filtered={Boolean(searchText.trim() || statusFilter || specialtyFilter || fromDate || toDate)}
          total={result?.total}
          page={page}
          empty={{
            title: 'Todavía no hay turnos',
            description: 'Cuando crees el primero va a aparecer acá con su estado.',
            ...(canCreate ? { action: { label: '+ Nuevo turno', onClick: () => navigate('/nuevo-turno') } } : {}),
          }}
          onRowClick={(a) => setSelectedAppointment(a)}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onAction={handleAction}
          role={role ?? 'DOCTOR'}
        />
      )}
    </div>
  );
}
