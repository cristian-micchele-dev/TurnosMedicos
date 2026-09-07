import { useAuth } from '../../auth/AuthContext';
import styles from './Header.module.css';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  PATIENT: 'Paciente',
};

export function Header() {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
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
