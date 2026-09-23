import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../hooks/useSocket';
import { useFetch } from '../../hooks/useFetch';
import { notificationsApi, type Inbox, type Notification } from '../../api/notifications';
import { useMyDoctor } from '../../hooks/useMyDoctor';
import { useDoctorAvatar } from '../../hooks/useDoctorAvatar';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../../hooks/useToast';
import styles from './Header.module.css';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  SECRETARY: 'Secretaría',
};

const pageTitles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/doctores':       'Doctores',
  '/pacientes':      'Pacientes',
  '/especialidades': 'Especialidades',
  '/turnos':         'Turnos',
  '/mis-turnos':     'Mi Agenda',
  '/usuarios':       'Usuarios',
  '/auditoria':      'Auditoría',
  '/mensajes':       'Mensajes',
  '/disponibilidad': 'Disponibilidad',
  '/nuevo-turno':    'Nuevo Turno',
  '/calendario':     'Calendario',
  '/cambiar-contrasena': 'Cambiar contraseña',
  '/agenda':         'Mi Agenda',
  '/perfil':         'Mi perfil',
};

interface HeaderProps {
  onMenuToggle: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const pageTitle = pageTitles[pathname] ?? 'Dashboard';

  // The bell reads the stored inbox; the socket only makes it arrive earlier.
  // Tres caminos hacia la campanita, de más rápido a más confiable: el socket la
  // empuja, volver a la pestaña la refresca, y un chequeo por minuto la cubre
  // cuando el socket no está conectado —el peor caso deja de ser 'hasta que recargues'.
  const { data: inbox, refetch: refetchInbox } = useFetch<Inbox>(
    ['notifications'],
    () => notificationsApi.inbox(20),
    { refetchInterval: 60_000, refetchOnWindowFocus: true, staleTime: 15_000 },
  );
  const notifications = inbox?.data ?? [];
  const unreadCount = inbox?.unread ?? 0;
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const socket = useSocket();
  const { doctor } = useMyDoctor();
  const avatarUrl = useDoctorAvatar(doctor);

  useEffect(() => {
    if (!socket) return;

    // A pushed notification is already a row on the server: announce it and reread
    // the inbox, so what the bell shows is always what is stored.
    const handleNotification = (data: Notification) => {
      toast.info(data.message);
      void refetchInbox();
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, toast, refetchInbox]);

  useEffect(() => {
    if (!panelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        bellRef.current &&
        !bellRef.current.contains(target)
      ) {
        setPanelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  function togglePanel() {
    setPanelOpen((prev) => !prev);
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    await refetchInbox();
  }

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    await refetchInbox();
  }

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <button
          className={styles.hamburger}
          onClick={onMenuToggle}
          aria-label="Abrir menu"
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      <div className={styles.userInfo}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            ref={bellRef}
            className={styles.notifBell}
            onClick={togglePanel}
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div ref={panelRef} className={styles.notifPanel}>
              <div className={styles.notifHeader}>
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <button className={styles.notifMarkAll} onClick={() => { void markAllRead(); }}>
                    Marcar todas como leidas
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className={styles.notifEmpty}>Sin notificaciones</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={[
                      styles.notifItem,
                      !n.read ? styles.notifItemUnread : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => { void markRead(n.id); }}
                  >
                    <div>{n.message}</div>
                    <div className={styles.notifTime}>{formatTime(new Date(n.createdAt))}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {user && (
          <Link to="/perfil" className={styles.userLink} title="Ver mi perfil">
            <Avatar name={user.name || user.email} src={avatarUrl} size="sm" />
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name || user.email}</span>
            </div>
            <span className={`${styles.roleBadge} ${styles[`role${user.role}`]}`}>
              {roleLabels[user.role] ?? user.role}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
