import { useState, useEffect, useCallback } from 'react';
import { appointmentsApi, type Appointment, type AppointmentStatus } from '../../api/appointments';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns Monday-anchored weekday index: Mon=0 … Sun=6 */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const isoDateString = toLocalDateString;

function formatTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatFullDate(date: Date): string {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${dayNames[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

/** Build the grid cells for a given month. Returns an array of Date | null,
 *  where null fills the leading/trailing slots (previous/next month days). */
function buildGridDays(year: number, month: number): Array<{ date: Date; outside: boolean }> {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  const leadingBlanks = mondayIndex(firstOfMonth);
  const trailingBlanks = 6 - mondayIndex(lastOfMonth);

  const cells: Array<{ date: Date; outside: boolean }> = [];

  // Days from previous month (grayed out)
  for (let i = leadingBlanks; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), outside: true });
  }

  // Days of the current month
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }

  // Days from next month (grayed out)
  for (let i = 1; i <= trailingBlanks; i++) {
    cells.push({ date: new Date(year, month + 1, i), outside: true });
  }

  return cells;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function dotClass(status: AppointmentStatus): string {
  switch (status) {
    case 'PENDING':   return styles.dotPending;
    case 'CONFIRMED': return styles.dotConfirmed;
    case 'COMPLETED': return styles.dotCompleted;
    case 'CANCELLED': return styles.dotCancelled;
  }
}

function statusClass(status: AppointmentStatus): string {
  switch (status) {
    case 'PENDING':   return styles.statusPending;
    case 'CONFIRMED': return styles.statusConfirmed;
    case 'COMPLETED': return styles.statusCompleted;
    case 'CANCELLED': return styles.statusCancelled;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchMonthAppointments = useCallback(async (monthStart: Date) => {
    setLoading(true);
    setError(null);
    try {
      const year  = monthStart.getFullYear();
      const month = monthStart.getMonth();
      const from  = isoDateString(new Date(year, month, 1));
      const to    = isoDateString(new Date(year, month + 1, 0));

      const response = await appointmentsApi.findAll({ from, to }, 1, 100);
      setAppointments(response.data ?? []);
    } catch {
      setError('No se pudieron cargar los turnos.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthAppointments(currentMonth);
    setSelectedDate(null);
  }, [currentMonth, fetchMonthAppointments]);

  // ── Navigation ───────────────────────────────────────────────────────────

  function prevMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  // ── Appointment index by day ─────────────────────────────────────────────

  const appointmentsByDay = appointments.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const d = new Date(appt.dateTime);
    const key = toDateKey(d);
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  // ── Grid ────────────────────────────────────────────────────────────────

  const gridDays = buildGridDays(currentMonth.getFullYear(), currentMonth.getMonth());

  const todayKey    = toDateKey(today);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  function handleDayClick(cell: { date: Date; outside: boolean }) {
    if (cell.outside) return;
    setSelectedDate(prev =>
      prev && toDateKey(prev) === toDateKey(cell.date) ? null : cell.date,
    );
  }

  // ── Selected day appointments ────────────────────────────────────────────

  const selectedDayAppointments = selectedDate
    ? (appointmentsByDay[toDateKey(selectedDate)] ?? []).sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      )
    : [];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Mes anterior">
            &#8249;
          </button>
          <span className={styles.monthTitle}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Mes siguiente">
            &#8250;
          </button>
        </div>

        <button className={styles.todayBtn} onClick={goToToday}>
          Hoy
        </button>
      </div>

      {/* Loading / error */}
      {loading && <p className={styles.loadingState}>Cargando turnos...</p>}
      {error   && <p className={styles.errorState}>{error}</p>}

      {/* Grid */}
      {!loading && (
        <div className={styles.grid}>
          {/* Day-of-week headers */}
          {DAY_HEADERS.map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}

          {/* Day cells */}
          {gridDays.map((cell, idx) => {
            const key      = toDateKey(cell.date);
            const isToday  = key === todayKey && !cell.outside;
            const isSelected = key === selectedKey && !cell.outside;
            const dayAppts = cell.outside ? [] : (appointmentsByDay[key] ?? []);

            const cellClass = [
              styles.dayCell,
              cell.outside   ? styles.dayCellOutside  : '',
              isToday        ? styles.dayCellToday    : '',
              isSelected     ? styles.dayCellSelected : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={idx}
                className={cellClass}
                onClick={() => handleDayClick(cell)}
                role={cell.outside ? undefined : 'button'}
                tabIndex={cell.outside ? -1 : 0}
                aria-label={
                  cell.outside
                    ? undefined
                    : `${cell.date.getDate()} de ${MONTH_NAMES[cell.date.getMonth()]}, ${dayAppts.length} turno(s)`
                }
                onKeyDown={e => {
                  if (!cell.outside && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleDayClick(cell);
                  }
                }}
              >
                <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>
                  {cell.date.getDate()}
                </span>

                {dayAppts.length > 0 && (
                  <div className={styles.dayDots}>
                    {dayAppts.map(appt => (
                      <span
                        key={appt.id}
                        className={`${styles.dot} ${dotClass(appt.status)}`}
                        title={STATUS_LABELS[appt.status]}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Day detail panel */}
      {selectedDate && !loading && (
        <div className={styles.dayDetail}>
          <p className={styles.dayDetailTitle}>
            Turnos del {formatFullDate(selectedDate)}
          </p>

          {selectedDayAppointments.length === 0 ? (
            <div className={styles.emptyDay}>Sin turnos para este día.</div>
          ) : (
            selectedDayAppointments.map(appt => {
              const doctorName   = appt.doctor?.user?.name ?? 'Doctor';
              const specialtyName = appt.doctor?.specialty?.name ?? '';

              return (
                <div key={appt.id} className={styles.appointmentCard}>
                  <div className={styles.cardLeft}>
                    <span className={styles.cardTime}>{formatTime(appt.dateTime)}</span>
                    <span className={styles.cardDoctor}>Dr. {doctorName}</span>
                    {specialtyName && (
                      <span className={styles.cardSpecialty}>{specialtyName}</span>
                    )}
                  </div>
                  <span className={`${styles.statusBadge} ${statusClass(appt.status)}`}>
                    {STATUS_LABELS[appt.status]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
