import { useAuth } from '../../auth/AuthContext';
import styles from './DashboardPage.module.css';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  accent: 'blue' | 'green' | 'amber' | 'slate';
}

const CARDS_BY_ROLE: Record<string, StatCard[]> = {
  ADMIN: [
    { label: 'Total Doctores', value: 24, icon: '👨‍⚕️', accent: 'blue' },
    { label: 'Total Pacientes', value: 381, icon: '🧑‍🦱', accent: 'green' },
    { label: 'Turnos Hoy', value: 47, icon: '📅', accent: 'amber' },
    { label: 'Especialidades', value: 8, icon: '🏥', accent: 'slate' },
  ],
  DOCTOR: [
    { label: 'Turnos Hoy', value: 12, icon: '📅', accent: 'blue' },
    { label: 'Turnos Pendientes', value: 5, icon: '⏳', accent: 'amber' },
    { label: 'Turnos Completados', value: 7, icon: '✅', accent: 'green' },
    { label: 'Próximo Turno', value: '10:30', icon: '🕥', accent: 'slate' },
  ],
  PATIENT: [
    { label: 'Mis Turnos', value: 3, icon: '📋', accent: 'blue' },
    { label: 'Próximo Turno', value: 'Lun 14', icon: '📅', accent: 'amber' },
    { label: 'Turnos Completados', value: 8, icon: '✅', accent: 'green' },
    { label: 'Médico Asignado', value: 'Dr. García', icon: '👨‍⚕️', accent: 'slate' },
  ],
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

  if (!user) return null;

  const cards = CARDS_BY_ROLE[user.role] ?? [];
  const displayName = user.email.split('@')[0];

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
            <div className={styles.cardIcon} aria-hidden="true">
              {card.icon}
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardValue}>{card.value}</span>
              <span className={styles.cardLabel}>{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
