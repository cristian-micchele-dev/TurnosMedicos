import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const sharedItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
];

const adminItems: NavItem[] = [
  { to: '/especialidades', label: 'Especialidades', icon: '🏥' },
  { to: '/doctores', label: 'Doctores', icon: '👨‍⚕️' },
  { to: '/pacientes', label: 'Pacientes', icon: '👤' },
  { to: '/turnos', label: 'Turnos', icon: '📅' },
];

const doctorItems: NavItem[] = [
  { to: '/mis-turnos', label: 'Mis Turnos', icon: '📅' },
  { to: '/disponibilidad', label: 'Mi Disponibilidad', icon: '🕐' },
];

const patientItems: NavItem[] = [
  { to: '/mis-turnos', label: 'Mis Turnos', icon: '📅' },
  { to: '/nuevo-turno', label: 'Nuevo Turno', icon: '➕' },
  { to: '/mi-perfil', label: 'Mi Perfil', icon: '👤' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (role === 'ADMIN') return [...sharedItems, ...adminItems];
  if (role === 'DOCTOR') return [...sharedItems, ...doctorItems];
  if (role === 'PATIENT') return [...sharedItems, ...patientItems];
  return sharedItems;
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const navItems = getNavItems(user?.role);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>+</span>
        <span className={styles.logoText}>TurnoMed</span>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={logout}>
          <span className={styles.navIcon} aria-hidden="true">🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
