import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import styles from './Header.module.css';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  PATIENT: 'Paciente',
};

const pageTitles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/doctores':       'Doctores',
  '/pacientes':      'Pacientes',
  '/especialidades': 'Especialidades',
  '/turnos':         'Turnos',
  '/mis-turnos':     'Turnos',
  '/usuarios':       'Usuarios',
  '/disponibilidad': 'Disponibilidad',
  '/nuevo-turno':    'Nuevo Turno',
  '/mi-perfil':      'Mi Perfil',
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? 'Dashboard';

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <button
          className={styles.hamburger}
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      {user && (
        <div className={styles.userInfo}>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
          <span className={`${styles.roleBadge} ${styles[`role${user.role}`]}`}>
            {roleLabels[user.role] ?? user.role}
          </span>
        </div>
      )}
    </header>
  );
}
