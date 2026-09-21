import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import styles from './Header.module.css';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
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
  '/calendario':     'Calendario',
  '/agenda':         'Mi Agenda',
};

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface SocketNotificationPayload {
  type: string;
  message: string;
  appointmentId?: string;
}

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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const socket = useSocket();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: SocketNotificationPayload) => {
      const notification: Notification = {
        id: crypto.randomUUID(),
        type: data.type,
        message: data.message,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      toast.info(data.message);
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, toast]);

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

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
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
                  <button className={styles.notifMarkAll} onClick={markAllRead}>
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
                    onClick={() => markRead(n.id)}
                  >
                    <div>{n.message}</div>
                    <div className={styles.notifTime}>{formatTime(n.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {user && (
          <>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name || user.email}</span>
            </div>
            <span className={`${styles.roleBadge} ${styles[`role${user.role}`]}`}>
              {roleLabels[user.role] ?? user.role}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
