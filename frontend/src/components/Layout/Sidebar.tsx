import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import layoutStyles from './Layout.module.css';
import { useEffect } from 'react';
import { messagesApi } from '../../api/messages';
import { useFetch } from '../../hooks/useFetch';
import { useSocket } from '../../hooks/useSocket';

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
  { to: '/mensajes',   label: 'Mensajes' },
];

const adminItems: NavItem[] = [
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/auditoria', label: 'Auditoría' },
  { to: '/especialidades', label: 'Especialidades' },
  { to: '/doctores', label: 'Doctores' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/turnos', label: 'Turnos' },
];

// The front desk lives in the day's schedule and the patient registry.
const secretaryItems: NavItem[] = [
  { to: '/turnos', label: 'Turnos' },
  { to: '/pacientes', label: 'Pacientes' },
];

const doctorItems: NavItem[] = [
  { to: '/agenda', label: 'Mi Agenda' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/disponibilidad', label: 'Mi Disponibilidad' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (role === 'ADMIN') return [...sharedItems, ...adminItems];
  if (role === 'DOCTOR') return [...sharedItems, ...doctorItems];
  if (role === 'SECRETARY') return [...sharedItems, ...secretaryItems];
  return sharedItems;
}

export function Sidebar({ isOpen, onClose, onRestartTour }: SidebarProps) {
  const { user, logout } = useAuth();
  const navItems = getNavItems(user?.role);

  // El badge sale del servidor, y el socket lo actualiza sin esperar al intervalo.
  const { data: unread, refetch: refetchUnread } = useFetch<{ unread: number }>(
    ['messages', 'unread'],
    () => messagesApi.unread(),
    { refetchInterval: 60_000, refetchOnWindowFocus: true, staleTime: 10_000 },
  );
  const unreadMessages = unread?.unread ?? 0;
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const onMessage = () => { void refetchUnread(); };
    socket.on('message', onMessage);
    return () => { socket.off('message', onMessage); };
  }, [socket, refetchUnread]);

  return (
    <>
      {isOpen && (
        <div className={layoutStyles.overlay} onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>+</span>
          <span className={styles.logoText}>Pulso</span>
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
                  {item.to === '/mensajes' && unreadMessages > 0 && (
                    <span className={styles.navBadge} aria-label={`${unreadMessages} mensajes sin leer`}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
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
