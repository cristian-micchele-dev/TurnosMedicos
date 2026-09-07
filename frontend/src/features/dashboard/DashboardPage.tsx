import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { dashboardApi, type DashboardStats } from '../../api/dashboard';
import { Spinner } from '../../components/ui/Spinner';
import styles from './DashboardPage.module.css';

interface StatCard {
  label: string;
  value: string | number;
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];

  const cards: StatCard[] = stats
    ? user.role === 'ADMIN'
      ? buildAdminCards(stats)
      : buildDefaultCards(stats)
    : [];

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

      {loading ? (
        <div className={styles.spinnerWrapper}>
          <Spinner size="lg" label="Cargando estadísticas..." />
        </div>
      ) : (
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
      )}
    </div>
  );
}
