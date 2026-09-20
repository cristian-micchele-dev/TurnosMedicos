import { useState, useMemo, useEffect } from 'react';
import { appointmentsApi, type Appointment, type AppointmentStatus } from '../../api/appointments';
import type { PaginatedResponse } from '../../api/users';
import { useFetch } from '../../hooks/useFetch';
import { AppointmentDetailModal } from '../appointments/AppointmentDetailModal';
import { useToast } from '../../hooks/useToast';
import { toLocalDateString } from '../../utils/date';
import styles from './AgendaPage.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_START = 7;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; colorClass: string }> = {
  PENDING:   { label: 'Pendiente',  colorClass: styles.statusPending },
  CONFIRMED: { label: 'Confirmado', colorClass: styles.statusConfirmed },
  CANCELLED: { label: 'Cancelado',  colorClass: styles.statusCancelled },
  COMPLETED: { label: 'Completado', colorClass: styles.statusCompleted },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSpanishDate(date: Date): string {
  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${day} de ${month}, ${year}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Returns top offset percent within the [HOUR_START, HOUR_END] window */
function topPercent(iso: string): number {
  const d = new Date(iso);
  const minutesFromStart = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
  return (minutesFromStart / (TOTAL_HOURS * 60)) * 100;
}

/** Returns height percent for a given duration in minutes */
function heightPercent(durationMinutes: number): number {
  return (durationMinutes / (TOTAL_HOURS * 60)) * 100;
}

/** Current time offset percent — null if outside window */
function currentTimePercent(): number | null {
  const now = new Date();
  const h = now.getHours();
  if (h < HOUR_START || h >= HOUR_END) return null;
  const minutes = (h - HOUR_START) * 60 + now.getMinutes();
  return (minutes / (TOTAL_HOURS * 60)) * 100;
}

function isSameDay(isoA: Date, isoB: Date): boolean {
  return (
    isoA.getFullYear() === isoB.getFullYear() &&
    isoA.getMonth() === isoB.getMonth() &&
    isoA.getDate() === isoB.getDate()
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgendaPage() {
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [nowPercent, setNowPercent] = useState<number | null>(currentTimePercent);

  // Refresh current-time indicator every minute
  useEffect(() => {
    const id = setInterval(() => setNowPercent(currentTimePercent()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { from, to } = useMemo(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    return {
      from: toLocalDateString(currentDate),
      to: toLocalDateString(next),
    };
  }, [currentDate]);

  const { data: result, loading, refetch } = useFetch<PaginatedResponse<Appointment>>(
    ['appointments', 'agenda', from, to],
    () => appointmentsApi.findAll({ from, to }, 1, 50),
  );

  const appointments = useMemo(() => {
    const list = result?.data ?? [];
    return [...list].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
  }, [result]);

  // Next upcoming appointment
  const nextAppointment = useMemo(() => {
    const now = new Date();
    return appointments.find(
      (a) =>
        new Date(a.dateTime) >= now &&
        a.status !== 'CANCELLED' &&
        a.status !== 'COMPLETED',
    ) ?? null;
  }, [appointments]);

  const isToday = isSameDay(currentDate, new Date());

  function goToPrev() {
    setCurrentDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  }

  function goToNext() {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  }

  async function handleAction(
    action: 'confirm' | 'cancel' | 'complete',
    appointment: Appointment,
    reason?: string,
    completeData?: { diagnosis?: string; notes?: string },
  ) {
    try {
      if (action === 'confirm') {
        await appointmentsApi.confirm(appointment.id);
        toast.success('Turno confirmado');
      } else if (action === 'cancel') {
        await appointmentsApi.cancel(appointment.id, reason);
        toast.success('Turno cancelado');
      } else {
        await appointmentsApi.complete(appointment.id, completeData);
        toast.success('Turno completado');
      }
      setSelectedAppointment(null);
      await refetch();
    } catch {
      toast.error('Error al actualizar el turno');
    }
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Mi Agenda</h1>
          <p className={styles.subtitle}>Vista diaria de tus turnos</p>
        </div>
      </header>

      {/* ── Day navigation ── */}
      <div className={styles.navBar}>
        <div className={styles.navControls}>
          <button className={styles.navBtn} onClick={goToPrev} aria-label="Día anterior">
            &#8249;
          </button>
          <span className={styles.dateLabel}>{formatSpanishDate(currentDate)}</span>
          <button className={styles.navBtn} onClick={goToNext} aria-label="Día siguiente">
            &#8250;
          </button>
        </div>
        {!isToday && (
          <button className={styles.todayBtn} onClick={goToToday}>
            Hoy
          </button>
        )}
      </div>

      {/* ── Summary bar ── */}
      <div className={styles.summaryBar}>
        {loading ? (
          <span className={styles.summaryText}>Cargando turnos...</span>
        ) : (
          <>
            <span className={styles.summaryCount}>
              {appointments.length} {appointments.length === 1 ? 'turno' : 'turnos'} hoy
            </span>
            {nextAppointment && (
              <span className={styles.summaryNext}>
                · Próximo:{' '}
                <strong>{nextAppointment.patient?.name ?? '—'}</strong>{' '}
                a las <strong>{formatTime(nextAppointment.dateTime)}</strong>
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Timeline ── */}
      {!loading && appointments.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <p className={styles.emptyTitle}>No hay turnos para este día</p>
          <p className={styles.emptySubtitle}>Disfrutá el descanso o revisá otro día</p>
        </div>
      ) : (
        <div className={styles.timelineWrapper}>
          {/* Time axis */}
          <div className={styles.timeAxis} aria-hidden="true">
            {hours.map((h) => (
              <div key={h} className={styles.timeLabel}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Grid + appointment blocks */}
          <div className={styles.timelineGrid}>
            {/* Hour grid lines */}
            {hours.map((h) => (
              <div
                key={h}
                className={styles.gridLine}
                style={{ top: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%` }}
              />
            ))}

            {/* Current time indicator */}
            {isToday && nowPercent !== null && (
              <div
                className={styles.currentTime}
                style={{ top: `${nowPercent}%` }}
                aria-label="Hora actual"
              />
            )}

            {/* Appointment blocks */}
            {appointments.map((appt) => {
              const top = topPercent(appt.dateTime);
              const height = Math.max(heightPercent(appt.durationMinutes), 3);
              const isNext = nextAppointment?.id === appt.id;
              const statusCfg = STATUS_CONFIG[appt.status];

              return (
                <div
                  key={appt.id}
                  className={`${styles.apptBlock} ${statusCfg.colorClass} ${isNext ? styles.apptNext : ''}`}
                  style={{ top: `${top}%`, height: `${height}%` }}
                  onClick={() => setSelectedAppointment(appt)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedAppointment(appt)}
                  aria-label={`Turno de ${appt.patient?.name ?? 'Paciente'} a las ${formatTime(appt.dateTime)}`}
                >
                  <div className={styles.apptTime}>{formatTime(appt.dateTime)}</div>
                  <div className={styles.apptPatient}>
                    {appt.patient?.name ?? '—'}
                  </div>
                  <div className={styles.apptCode}>{appt.code}</div>
                  <span className={`${styles.apptBadge} ${statusCfg.colorClass}`}>
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onAction={handleAction}
          role="DOCTOR"
        />
      )}
    </div>
  );
}
