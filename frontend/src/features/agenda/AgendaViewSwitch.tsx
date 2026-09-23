import { NavLink } from 'react-router-dom';
import { CalendarDays, List } from 'lucide-react';
import styles from './AgendaViewSwitch.module.css';

// One sidebar entry, two ways to look at the doctor's appointments: the day timeline or the filterable list.
export function AgendaViewSwitch() {
  const cls = ({ isActive }: { isActive: boolean }) => `${styles.option} ${isActive ? styles.active : ''}`;
  return (
    <nav className={styles.switch} aria-label="Vista de la agenda">
      <NavLink to="/agenda" end className={cls}>
        <CalendarDays size={15} aria-hidden /> Día
      </NavLink>
      <NavLink to="/turnos" className={cls}>
        <List size={15} aria-hidden /> Lista
      </NavLink>
    </nav>
  );
}
