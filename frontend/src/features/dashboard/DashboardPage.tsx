import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, HeartPulse, Users, Zap, AlertTriangle, RefreshCw, Calendar, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, type DashboardStats, type ChartData } from '../../api/dashboard';
import { appointmentsApi, type Appointment } from '../../api/appointments';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';

import { todayLocal } from '../../utils/date';
import { ConstellationBackground } from '../../components/ui/ConstellationBackground';
import styles from './DashboardPage.module.css';

// Colour is reserved for clinical state: 'pending' and 'done' are the amber and green
// of a turno; everything that counts people or entities stays in the brand's ink.
type Accent = 'neutral' | 'pending' | 'done';

interface StatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: Accent;
  /** Where the number drills down to (the list, pre-filtered). */
  to?: string;
}

interface QuickAction {
  label: string;
  to: string;
}

function buildAdminCards(stats: DashboardStats): StatCard[] {
  return [
    { label: 'Doctores', value: stats.totalDoctors ?? '—', icon: Stethoscope, accent: 'neutral', to: '/doctores' },
    { label: 'Pacientes', value: stats.totalPatients ?? '—', icon: HeartPulse, accent: 'neutral', to: '/pacientes' },
    { label: 'Usuarios', value: stats.totalUsers ?? '—', icon: Users, accent: 'neutral', to: '/usuarios' },
    { label: 'Activos', value: stats.activeUsers ?? '—', icon: Zap, accent: 'neutral', to: '/usuarios' },
  ];
}

function buildDoctorCards(todayCount: number, pendingCount: number, completedCount: number): StatCard[] {
  return [
    { label: 'Turnos Hoy', value: todayCount, icon: Calendar, accent: 'neutral', to: '/agenda' },
    { label: 'Pendientes', value: pendingCount, icon: Clock, accent: 'pending', to: '/turnos?status=PENDING' },
    { label: 'Completados', value: completedCount, icon: CheckCircle, accent: 'done', to: '/turnos?status=COMPLETED' },
  ];
}

function buildSecretaryCards(todayCount: number, pendingCount: number, totalPatients: number | undefined): StatCard[] {
  return [
    { label: 'Turnos Hoy', value: todayCount, icon: Calendar, accent: 'neutral', to: '/turnos' },
    { label: 'Por Confirmar', value: pendingCount, icon: Clock, accent: 'pending', to: '/turnos?status=PENDING' },
    { label: 'Pacientes', value: totalPatients ?? '—', icon: HeartPulse, accent: 'neutral', to: '/pacientes' },
  ];
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  ADMIN: [
    { label: 'Crear Doctor', to: '/doctores' },
    { label: 'Crear Paciente', to: '/pacientes' },
    { label: 'Ver Turnos', to: '/turnos' },
    { label: 'Gestionar Usuarios', to: '/usuarios' },
  ],
  SECRETARY: [
    { label: 'Nuevo Turno', to: '/nuevo-turno' },
    { label: 'Registrar Paciente', to: '/pacientes' },
    { label: 'Ver Turnos', to: '/turnos' },
  ],
  DOCTOR: [
    { label: 'Nuevo Turno', to: '/nuevo-turno' },
    { label: 'Registrar Paciente', to: '/pacientes' },
    { label: 'Mi Disponibilidad', to: '/disponibilidad' },
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
  SECRETARY: 'Secretaría',
};

const ROLE_ACCENT: Record<string, string> = {
  ADMIN: styles.badgeAdmin,
  DOCTOR: styles.badgeDoctor,
  SECRETARY: styles.badgeSecretary,
};

// Maps Spanish status labels to semantic chart colors
const STATUS_CHART_COLOR: Record<string, string> = {
  Pendiente: '#fbbf24',
  Confirmado: '#06b6d4',
  Completado: '#34d399',
  Cancelado: '#f87171',
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [roleCards, setRoleCards] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);

    const today = todayLocal();

    const baseRequests: Promise<unknown>[] = [
      dashboardApi.getStats(),
      appointmentsApi.findAll({ status: 'PENDING' }, 1, 5).catch(() => ({ data: [] as Appointment[], total: 0 })),
    ];

    if (user?.role === 'ADMIN') {
      baseRequests.push(dashboardApi.getCharts().catch(() => null));
    } else if (user?.role === 'DOCTOR') {
      baseRequests.push(
        appointmentsApi.findAll({ from: today, to: today }, 1, 1).catch(() => ({ total: 0 })),
        appointmentsApi.findAll({ status: 'PENDING' }, 1, 1).catch(() => ({ total: 0 })),
        appointmentsApi.findAll({ status: 'COMPLETED' }, 1, 1).catch(() => ({ total: 0 })),
      );
    } else if (user?.role === 'SECRETARY') {
      baseRequests.push(
        appointmentsApi.findAll({ from: today, to: today }, 1, 1).catch(() => ({ total: 0 })),
        appointmentsApi.findAll({ status: 'PENDING' }, 1, 1).catch(() => ({ total: 0 })),
      );
    }

    Promise.all(baseRequests)
      .then((results) => {
        const statsData = results[0] as DashboardStats;
        const appts = results[1] as { data: Appointment[]; total: number };
        setStats(statsData);
        setAppointments(appts.data);

        if (user?.role === 'ADMIN') {
          setChartData(results[2] as ChartData | null);
        } else if (user?.role === 'DOCTOR') {
          const todayRes = results[2] as { total: number };
          const pendingRes = results[3] as { total: number };
          const completedRes = results[4] as { total: number };
          setRoleCards(buildDoctorCards(todayRes.total, pendingRes.total, completedRes.total));
        } else if (user?.role === 'SECRETARY') {
          const todayRes = results[2] as { total: number };
          const pendingRes = results[3] as { total: number };
          setRoleCards(buildSecretaryCards(todayRes.total, pendingRes.total, statsData.totalPatients));
        }
      })
      .catch(() => setError('No se pudo cargar el dashboard. Verificá tu conexión.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const cards: StatCard[] = stats
    ? user.role === 'ADMIN' ? buildAdminCards(stats) : roleCards
    : [];
  const actions = QUICK_ACTIONS[user.role] ?? [];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.meshBg} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.skeletonHeader}>
            <Skeleton variant="text" width="280px" height="2rem" />
            <Skeleton variant="text" width="180px" height="1rem" />
          </div>
          <div className={styles.grid}>
            <Skeleton variant="rectangular" height="80px" />
            <Skeleton variant="rectangular" height="80px" />
            <Skeleton variant="rectangular" height="80px" />
            <Skeleton variant="rectangular" height="80px" />
          </div>
          <div className={styles.skeletonSection}>
            <Skeleton variant="text" width="140px" height="0.75rem" />
            <div className={styles.skeletonRows}>
              <Skeleton variant="rectangular" height="52px" />
              <Skeleton variant="rectangular" height="52px" />
              <Skeleton variant="rectangular" height="52px" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.meshBg} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.errorState}>
            <AlertTriangle size={40} strokeWidth={1.5} />
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchData}>
              <RefreshCw size={16} strokeWidth={2} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Living background: a quiet constellation drifting ── */}
      <div className={styles.meshBg} aria-hidden="true" />
      <ConstellationBackground className={styles.backdrop} />
      <div className={styles.inner}>
        {/* ── Hero banner ── */}
        <div className={styles.hero}>
          <div className={styles.heroBg} aria-hidden="true" />
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.greeting}>
                Bienvenido, <span className={styles.greetingAccent}>{displayName}</span>
              </h1>
              <p className={styles.subtext}>{user.role === 'DOCTOR' ? 'Resumen de tu jornada' : 'Resumen de la actividad del hospital'}</p>
            </div>
            <span className={`${styles.badge} ${ROLE_ACCENT[user.role] ?? ''}`}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className={styles.grid} data-tour="stats">
          {cards.map((card) => {
            const Icon = card.icon;
            const body = (
              <>
                <div className={styles.cardIcon}>
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.cardValue}>{card.value}</span>
                  <span className={styles.cardLabel}>{card.label}</span>
                </div>
              </>
            );
            const className = `${styles.card} ${styles[card.accent]}`;
            return card.to ? (
              <Link key={card.label} to={card.to} className={`${className} ${styles.cardLink}`} aria-label={`${card.value} ${card.label} — ver detalle`}>
                {body}
                <ChevronRight size={18} className={styles.cardArrow} aria-hidden />
              </Link>
            ) : (
              <div key={card.label} className={className}>{body}</div>
            );
          })}
        </div>

        {/* ── Quick actions ── */}
        <section className={styles.section} data-tour="actions">
          <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
          <div className={styles.actionsGrid}>
            {actions.map((action) => (
              <button
                key={action.to}
                className={styles.actionCard}
                onClick={() => navigate(action.to)}
              >
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionArrow}>{'\u2192'}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Upcoming appointments ── */}
        <section className={styles.section} data-tour="appointments">
          <h2 className={styles.sectionTitle}>Próximos turnos</h2>
          {appointments.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No hay turnos pendientes</p>
            </div>
          ) : (
            <div className={styles.appointmentsList}>
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className={`${styles.appointmentRow} ${styles.clickable}`}
                  onClick={() => navigate('/turnos')}
                >
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
                      {appt.patient?.name || 'Paciente'}
                    </span>
                  </div>
                  <Badge variant={STATUS_VARIANT[appt.status] ?? 'neutral'} size="sm">
                    {STATUS_LABEL[appt.status] ?? appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <span className={styles.viewAllLink} onClick={() => navigate('/turnos')}>
            Ver todos
            <ChevronRight size={14} strokeWidth={2.5} />
          </span>
        </section>

        {/* ── Analytics charts — ADMIN only ── */}
        {user.role === 'ADMIN' && chartData && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Analítica</h2>
            <div className={styles.chartsGrid}>

              {/* Turnos por mes */}
              <div className={`${styles.chartCard} ${styles.chartWide}`}>
                <p className={styles.chartTitle}>Turnos por mes</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData.appointmentsByMonth} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                      cursor={{ stroke: 'rgba(6,182,212,0.2)', strokeWidth: 1 }}
                      formatter={(value) => [value ?? 0, 'Turnos']}
                    />
                    <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#areaGradient)" dot={false} activeDot={{ r: 4, fill: '#06b6d4' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Turnos por estado */}
              <div className={styles.chartCard}>
                <p className={styles.chartTitle}>Estado de turnos</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData.appointmentsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {chartData.appointmentsByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_CHART_COLOR[entry.status] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                      formatter={(value, name) => [value ?? 0, name]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top especialidades */}
              <div className={styles.chartCard}>
                <p className={styles.chartTitle}>Top especialidades</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.topSpecialties} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(value) => [value ?? 0, 'Turnos']}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          </section>
        )}
      </div>
    </div>
  );
}
