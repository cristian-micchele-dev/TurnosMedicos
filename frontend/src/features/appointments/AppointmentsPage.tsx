import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  appointmentsApi,
  type Appointment,
  type AppointmentFilters,
  type AppointmentStatus,
} from '../../api/appointments';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../auth/AuthContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
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

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const filters: AppointmentFilters = {};
      if (statusFilter) filters.status = statusFilter as AppointmentStatus;
      if (fromDate) filters.from = fromDate;
      if (toDate) filters.to = toDate;
      const data = await appointmentsApi.findAll(filters);
      setAppointments(data);
    } catch {
      toast.error('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, fromDate, toDate]);

  const handleAction = async (
    action: 'confirm' | 'cancel' | 'complete',
    appointment: Appointment,
    reason?: string,
  ) => {
    try {
      if (action === 'confirm') {
        await appointmentsApi.confirm(appointment.id);
        toast.success('Turno confirmado');
      } else if (action === 'cancel') {
        await appointmentsApi.cancel(appointment.id, reason);
        toast.success('Turno cancelado');
      } else {
        await appointmentsApi.complete(appointment.id);
        toast.success('Turno completado');
      }
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch {
      toast.error('Error al actualizar el turno');
    }
  };

  const role = user?.role ?? 'PATIENT';
  const canCreate = role === 'PATIENT' || role === 'ADMIN';

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
    } else if (role === 'PATIENT') {
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
    }

    return <div className={styles.actions}>{buttons}</div>;
  };

  const columns = [
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
        <span className={styles.nameCell}>{a.patient?.user?.name ?? '—'}</span>
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
            {role === 'PATIENT' ? 'Tus turnos médicos' : 'Gestión de turnos'}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => navigate('/appointments/new')}>
            + Nuevo Turno
          </Button>
        )}
      </header>

      <div className={styles.filtersBar}>
        <Select
          label="Estado"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos los estados"
        />
        <Input
          label="Desde"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        {(statusFilter || fromDate || toDate) && (
          <div className={styles.clearFilter}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setFromDate('');
                setToDate('');
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
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
      </div>

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onAction={handleAction}
          role={role}
        />
      )}
    </div>
  );
}
