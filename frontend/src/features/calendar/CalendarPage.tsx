import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, type AppointmentStatus, type DaySummary } from '../../api/appointments';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { toLocalDateString } from '../../utils/date';
import styles from './CalendarPage.module.css';

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

// Fixed display order so a day's dots always read the same way.
const STATUS_ORDER: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const MAX_DOTS = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns Monday-anchored weekday index: Mon=0 … Sun=6 */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Build the grid cells for a given month, padded with the surrounding days (grayed out). */
function buildGridDays(year: number, month: number): Array<{ date: Date; outside: boolean }> {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);
  const cells: Array<{ date: Date; outside: boolean }> = [];

  for (let i = mondayIndex(firstOfMonth); i > 0; i--) cells.push({ date: new Date(year, month, 1 - i), outside: true });
  for (let d = 1; d <= lastOfMonth.getDate(); d++) cells.push({ date: new Date(year, month, d), outside: false });
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) cells.push({ date: new Date(year, month + 1, i), outside: true });

  return cells;
}

function dotClass(status: AppointmentStatus): string {
  switch (status) {
    case 'PENDING':   return styles.dotPending;
    case 'CONFIRMED': return styles.dotConfirmed;
    case 'COMPLETED': return styles.dotCompleted;
    case 'CANCELLED': return styles.dotCancelled;
  }
}

type DayCounts = Partial<Record<AppointmentStatus, number>> & { total: number };

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));

  const from = toLocalDateString(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const to   = toLocalDateString(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

  // One aggregated request per month — counts, not rows — so it never hits the page limit.
  const { data: summary, loading, error } = useFetch<DaySummary[]>(
    ['appointments', 'summary', from, to],
    () => appointmentsApi.summary(from, to),
  );

  const countsByDay = useMemo(() => {
    const map: Record<string, DayCounts> = {};
    for (const row of summary ?? []) {
      const day = (map[row.date] ??= { total: 0 });
      day[row.status] = (day[row.status] ?? 0) + row.count;
      day.total += row.count;
    }
    return map;
  }, [summary]);

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  // The calendar navigates; the day itself is handled by the view that owns it.
  const openDay = (date: Date) => {
    const iso = toLocalDateString(date);
    navigate(user?.role === 'DOCTOR' ? `/agenda?date=${iso}` : `/turnos?from=${iso}&to=${iso}`);
  };

  const gridDays = buildGridDays(currentMonth.getFullYear(), currentMonth.getMonth());
  const todayIso = toLocalDateString(today);

  return (
    <div className={styles.page}>
      <div className={styles.calendarHeader}>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Mes anterior">&#8249;</button>
          <span className={styles.monthTitle}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Mes siguiente">&#8250;</button>
        </div>
        <button className={styles.todayBtn} onClick={goToToday}>Hoy</button>
      </div>

      {error && <p className={styles.errorState}>No se pudieron cargar los turnos del mes.</p>}

      <div className={styles.grid} aria-busy={loading || undefined}>
        {DAY_HEADERS.map(day => (
          <div key={day} className={styles.dayHeader}>{day}</div>
        ))}

        {gridDays.map((cell, idx) => {
          const iso = toLocalDateString(cell.date);
          const isToday = iso === todayIso && !cell.outside;
          const counts = cell.outside ? undefined : countsByDay[iso];
          const total = counts?.total ?? 0;

          const dots = counts
            ? STATUS_ORDER.flatMap(status => Array.from({ length: Math.min(counts[status] ?? 0, MAX_DOTS) }, (_, i) => ({ status, key: `${status}-${i}` }))).slice(0, MAX_DOTS)
            : [];

          const cellClass = [
            styles.dayCell,
            cell.outside ? styles.dayCellOutside : '',
            isToday ? styles.dayCellToday : '',
            total > 0 ? styles.dayCellBusy : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={idx}
              className={cellClass}
              onClick={() => !cell.outside && openDay(cell.date)}
              role={cell.outside ? undefined : 'button'}
              tabIndex={cell.outside ? -1 : 0}
              aria-label={cell.outside ? undefined : `${cell.date.getDate()} de ${MONTH_NAMES[cell.date.getMonth()]}, ${total} turno(s)`}
              onKeyDown={e => {
                if (!cell.outside && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(cell.date); }
              }}
            >
              <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>
                {cell.date.getDate()}
              </span>

              {total > 0 && (
                <div className={styles.dayMeta}>
                  <div className={styles.dayDots}>
                    {dots.map(d => (
                      <span key={d.key} className={`${styles.dot} ${dotClass(d.status)}`} title={STATUS_LABELS[d.status]} />
                    ))}
                  </div>
                  <span className={styles.dayCount}>{total}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.hint}>Hacé clic en un día para ver sus turnos.</p>
    </div>
  );
}
