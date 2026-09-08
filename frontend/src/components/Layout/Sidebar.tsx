import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import styles from './Sidebar.module.css';
import layoutStyles from './Layout.module.css';

interface NavItem {
  to: string;
  label: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const sharedItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
];

const adminItems: NavItem[] = [
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/especialidades', label: 'Especialidades' },
  { to: '/doctores', label: 'Doctores' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/turnos', label: 'Turnos' },
];

const doctorItems: NavItem[] = [
  { to: '/mis-turnos', label: 'Mis Turnos' },
  { to: '/disponibilidad', label: 'Mi Disponibilidad' },
];

const patientItems: NavItem[] = [
  { to: '/mis-turnos', label: 'Mis Turnos' },
  { to: '/nuevo-turno', label: 'Nuevo Turno' },
  { to: '/mi-perfil', label: 'Mi Perfil' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (role === 'ADMIN') return [...sharedItems, ...adminItems];
  if (role === 'DOCTOR') return [...sharedItems, ...doctorItems];
  if (role === 'PATIENT') return [...sharedItems, ...patientItems];
  return sharedItems;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navItems = getNavItems(user?.role);

  return (
    <>
      {isOpen && (
        <div className={layoutStyles.overlay} onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
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
                  onClick={onClose}
                >
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={logout}>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
