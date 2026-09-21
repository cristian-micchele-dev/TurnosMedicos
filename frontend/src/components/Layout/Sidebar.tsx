import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import layoutStyles from './Layout.module.css';

interface NavItem {
  to: string;
  label: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTour?: () => void;
}

const sharedItems: NavItem[] = [
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/calendario', label: 'Calendario' },
];

const adminItems: NavItem[] = [
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/especialidades', label: 'Especialidades' },
  { to: '/doctores', label: 'Doctores' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/turnos', label: 'Turnos' },
];

const doctorItems: NavItem[] = [
  { to: '/agenda', label: 'Mi Agenda' },
  { to: '/mis-turnos', label: 'Mis Turnos' },
  { to: '/disponibilidad', label: 'Mi Disponibilidad' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (role === 'ADMIN') return [...sharedItems, ...adminItems];
  if (role === 'DOCTOR') return [...sharedItems, ...doctorItems];
  return sharedItems;
}

export function Sidebar({ isOpen, onClose, onRestartTour }: SidebarProps) {
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

        <nav className={styles.nav} data-tour="sidebar-nav">
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
          {onRestartTour && (
            <button className={styles.tourLink} onClick={() => { onRestartTour(); onClose(); }}>
              Ver tutorial
            </button>
          )}
          <Link to="/cambiar-contrasena" className={styles.tourLink} onClick={onClose}>
            Cambiar contraseña
          </Link>
          <button className={styles.logoutBtn} onClick={logout}>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
