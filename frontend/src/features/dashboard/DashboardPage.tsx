import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { dashboardApi, type DashboardStats } from '../../api/dashboard';
import { appointmentsApi, type Appointment } from '../../api/appointments';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import styles from './DashboardPage.module.css';

interface StatCard {
  label: string;
  value: string | number;
  accent: 'blue' | 'green' | 'amber' | 'slate';
}

interface QuickAction {
  label: string;
  to: string;
  accent: 'blue' | 'green' | 'amber' | 'slate';
}

function buildAdminCards(stats: DashboardStats): StatCard[] {
  return [
    { label: 'Total Doctores', value: stats.totalDoctors ?? '—', accent: 'blue' },
    { label: 'Total Pacientes', value: stats.totalPatients ?? '—', accent: 'green' },
    { label: 'Total Usuarios', value: stats.totalUsers ?? '—', accent: 'amber' },
    { label: 'Usuarios Activos', value: stats.activeUsers ?? '—', accent: 'slate' },
  ];
}

function buildDefaultCards(stats: DashboardStats): StatCard[] {
  return [
    { label: 'Total Usuarios', value: stats.totalUsers ?? '—', accent: 'blue' },
  ];
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  ADMIN: [
    { label: 'Crear Doctor', to: '/doctores', accent: 'blue' },
    { label: 'Crear Paciente', to: '/pacientes', accent: 'green' },
    { label: 'Ver Turnos', to: '/turnos', accent: 'amber' },
    { label: 'Gestionar Usuarios', to: '/usuarios', accent: 'slate' },
  ],
  DOCTOR: [
    { label: 'Mis Turnos', to: '/mis-turnos', accent: 'blue' },
    { label: 'Mi Disponibilidad', to: '/disponibilidad', accent: 'green' },
  ],
  PATIENT: [
    { label: 'Sacar Turno', to: '/nuevo-turno', accent: 'blue' },
    { label: 'Mis Turnos', to: '/mis-turnos', accent: 'green' },
    { label: 'Mi Perfil', to: '/mi-perfil', accent: 'slate' },
  ],
};

const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Doctor',
  PATIENT: 'Paciente',
};

const ROLE_ACCENT: Record<string, string> = {
  ADMIN: styles.badgeAdmin,
  DOCTOR: styles.badgeDoctor,
  PATIENT: styles.badgePatient,
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      appointmentsApi.findAll({ status: 'PENDING' }).catch(() => [] as Appointment[]),
    ])
      .then(([statsData, appts]) => {
        setStats(statsData);
        setAppointments(appts.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const cards: StatCard[] = stats
    ? user.role === 'ADMIN' ? buildAdminCards(stats) : buildDefaultCards(stats)
    : [];
  const actions = QUICK_ACTIONS[user.role] ?? [];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrapper}>
          <Spinner size="lg" label="Cargando..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.greeting}>Bienvenido, {displayName}</h1>
          <p className={styles.subtext}>Aquí está el resumen de tu actividad</p>
        </div>
        <span className={`${styles.badge} ${ROLE_ACCENT[user.role] ?? ''}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </header>

      <div className={styles.grid}>
        {cards.map((card) => (
          <div key={card.label} className={`${styles.card} ${styles[card.accent]}`}>
            <div className={styles.cardBody}>
              <span className={styles.cardValue}>{card.value}</span>
              <span className={styles.cardLabel}>{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
        <div className={styles.actionsGrid}>
          {actions.map((action) => (
            <button
              key={action.to}
              className={`${styles.actionCard} ${styles[action.accent]}`}
              onClick={() => navigate(action.to)}
            >
              <span className={styles.actionLabel}>{action.label}</span>
              <span className={styles.actionArrow}>→</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Próximos turnos</h2>
        {appointments.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No hay turnos pendientes</p>
          </div>
        ) : (
          <div className={styles.appointmentsList}>
            {appointments.map((appt) => (
              <div key={appt.id} className={styles.appointmentRow}>
                <div className={styles.appointmentInfo}>
                  <span className={styles.appointmentDate}>
                    {new Date(appt.dateTime).toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className={styles.appointmentTime}>
                    {new Date(appt.dateTime).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className={styles.appointmentDetails}>
                  <span className={styles.appointmentDoctor}>
                    {appt.doctor?.user?.name || appt.doctor?.specialty?.name || 'Doctor'}
                  </span>
                  <span className={styles.appointmentPatient}>
                    {appt.patient?.user?.name || 'Paciente'}
                  </span>
                </div>
                <Badge variant={STATUS_VARIANT[appt.status] ?? 'neutral'} size="sm">
                  {STATUS_LABEL[appt.status] ?? appt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
