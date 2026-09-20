import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../auth/AuthContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import styles from './AppointmentsPage.module.css';

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

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

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
    try {
      if (action === 'confirm') {
        await appointmentsApi.confirm(appointment.id);
        toast.success('Turno confirmado');
      } else if (action === 'cancel') {
        await appointmentsApi.cancel(appointment.id, reason);
        toast.success('Turno cancelado');
      } else {
        await appointmentsApi.complete(appointment.id, completeData);
        toast.success('Turno completado');
      }
      setSelectedAppointment(null);
      await refetchAppointments();
    } catch {
      toast.error('Error al actualizar el turno');
    }
  };

  const role = user?.role;
  const canCreate = role === 'ADMIN' || role === 'DOCTOR';

  const renderActions = (appt: Appointment) => {
    const { status } = appt;
    const buttons: React.ReactNode[] = [];

    if (role === 'ADMIN') {
      if (status === 'PENDING') {
        buttons.push(
          <Button
            key="confirm"
            variant="ghost"
            size="sm"
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
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAppointment(appt);
            }}
          >
            Cancelar
          </Button>,
        );
      }
      if (status === 'CONFIRMED') {
        buttons.push(
          <Button
            key="complete"
            variant="ghost"
            size="sm"
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
      width: '110px',
      render: (a: Appointment) => (
        <span className={styles.codeCell}>{a.code}</span>
      ),
    },
    {
      key: 'dateTime',
      header: 'Fecha / Hora',
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
      width: '200px',
      render: renderActions,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Turnos</h1>
          <p className={styles.subtitle}>
            {role === 'DOCTOR' ? 'Tus turnos' : 'Gestión de turnos'}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => navigate('/nuevo-turno')}>
            + Nuevo Turno
          </Button>
        )}
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
              placeholder="Buscar por código, paciente o doctor..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtersRow}>
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            placeholder="Todos los estados"
          />
          <Select
            label="Especialidad"
            options={specialtyOptions}
            value={specialtyFilter}
            onChange={(v) => setSpecialtyFilter(v)}
            placeholder="Todas las especialidades"
          />
          <Input
            label="Desde"
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          />
          <Input
            label="Hasta"
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          />
          {(searchText || statusFilter || specialtyFilter || fromDate || toDate) && (
            <div className={styles.clearFilter}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchText('');
                  setStatusFilter('');
                  setSpecialtyFilter('');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
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
          emptyMessage="No hay turnos que coincidan con los filtros"
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
