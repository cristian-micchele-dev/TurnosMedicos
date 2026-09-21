import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgendaViewSwitch } from './AgendaViewSwitch';
import { appointmentsApi, type Appointment, type AppointmentStatus } from '../../api/appointments';
import { doctorsApi, type Availability } from '../../api/doctors';
import type { PaginatedResponse } from '../../api/users';
import { useFetch } from '../../hooks/useFetch';
import { AppointmentDetailModal } from '../appointments/AppointmentDetailModal';
import { useToast } from '../../hooks/useToast';
import { toLocalDateString } from '../../utils/date';
import styles from './AgendaPage.module.css';
import { apiErrorMessage } from '../../api/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_HOUR_START = 7;
const DEFAULT_HOUR_END = 20;
const EARLIEST_HOUR = 6;
const LATEST_HOUR = 22;

const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Hour window that fits every availability block AND every appointment of the day, with one hour of margin. */
function hourRange(blocks: Availability[], appts: Appointment[]): { start: number; end: number } {
  // Base window from the working hours, clamped to [6, 22]…
  let start = DEFAULT_HOUR_START, end = DEFAULT_HOUR_END;
  if (blocks.length > 0) {
    start = Math.max(EARLIEST_HOUR, Math.floor(Math.min(...blocks.map((b) => toMinutes(b.startTime))) / 60) - 1);
    end = Math.min(LATEST_HOUR, Math.ceil(Math.max(...blocks.map((b) => toMinutes(b.endTime))) / 60) + 1);
  }
  // …then widened so no appointment of the day is ever clipped out of view.
  for (const a of appts) {
    const d = new Date(a.dateTime);
    const from = d.getHours() * 60 + d.getMinutes();
    start = Math.max(0, Math.min(start, Math.floor(from / 60)));
    end = Math.min(24, Math.max(end, Math.ceil((from + a.durationMinutes) / 60)));
  }
  return { start, end };
}

/** Slots a block offers, e.g. 08:00–12:00 at 30 min = 8. */
function slotsIn(block: Availability): number {
  return Math.max(0, Math.floor((toMinutes(block.endTime) - toMinutes(block.startTime)) / (block.slotDuration || 30)));
}

function formatRelative(minutes: number): string {
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `en ${h} h ${m} min` : `en ${h} h`;
}

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

type Window = { start: number; end: number };

const minutesToPercent = (minutes: number, w: Window) => ((minutes - w.start * 60) / ((w.end - w.start) * 60)) * 100;

function topPercent(iso: string, w: Window): number {
  const d = new Date(iso);
  return minutesToPercent(d.getHours() * 60 + d.getMinutes(), w);
}

function heightPercent(durationMinutes: number, w: Window): number {
  return (durationMinutes / ((w.end - w.start) * 60)) * 100;
}

/** Current time offset percent — null if outside window */
function currentTimePercent(w: Window): number | null {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < w.start * 60 || minutes >= w.end * 60) return null;
  return minutesToPercent(minutes, w);
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

  // ?date=YYYY-MM-DD lets the month calendar (and any link) open a specific day.
  const [searchParams, setSearchParams] = useSearchParams();
  const currentDate = useMemo(() => {
    const param = searchParams.get('date');
    const m = param?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [searchParams]);
  const setCurrentDate = (next: Date | ((prev: Date) => Date)) => {
    const value = typeof next === 'function' ? next(currentDate) : next;
    const iso = toLocalDateString(value);
    setSearchParams(iso === toLocalDateString(new Date()) ? {} : { date: iso }, { replace: true });
  };

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // The backend treats a bare date as that whole clinic day, so from === to.
  const day = toLocalDateString(currentDate);

  const { data: result, loading, refetch } = useFetch<PaginatedResponse<Appointment>>(
    ['appointments', 'agenda', day],
    () => appointmentsApi.findAll({ from: day, to: day }, 1, 50),
  );

  const { data: availability } = useFetch<Availability[]>(
    ['availability', 'me'],
    async () => doctorsApi.getAvailability((await doctorsApi.me()).id),
  );

  const dayBlocks = useMemo(
    () => (availability ?? []).filter((b) => b.dayOfWeek === currentDate.getDay()),
    [availability, currentDate],
  );
  const [nowPercent, setNowPercent] = useState<number | null>(null);

  // Blocks are positioned by wall-clock hour only, so anything outside this day must be dropped.
  const appointments = useMemo(() => {
    const list = (result?.data ?? []).filter((a) => isSameDay(new Date(a.dateTime), currentDate));
    return [...list].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );
  }, [result, currentDate]);

  const window = useMemo(() => hourRange(availability ?? [], appointments), [availability, appointments]);

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

  useEffect(() => {
    setNowPercent(currentTimePercent(window));
    const id = setInterval(() => setNowPercent(currentTimePercent(window)), 60_000);
    return () => clearInterval(id);
  }, [window]);

  const isToday = isSameDay(currentDate, new Date());

  // ── Day briefing ──
  const active = appointments.filter((a) => a.status !== 'CANCELLED');
  const byStatus = (st: AppointmentStatus) => appointments.filter((a) => a.status === st).length;
  const totalSlots = dayBlocks.reduce((n, b) => n + slotsIn(b), 0);
  const freeSlots = Math.max(0, totalSlots - active.length);
  const minutesToNext = nextAppointment
    ? Math.round((new Date(nextAppointment.dateTime).getTime() - Date.now()) / 60_000)
    : null;

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
        toast.success(`Turno ${appointment.code} confirmado`);
      } else if (action === 'cancel') {
        await appointmentsApi.cancel(appointment.id, reason);
        toast.success(`Turno ${appointment.code} cancelado`);
      } else {
        await appointmentsApi.complete(appointment.id, completeData);
        toast.success(`Turno ${appointment.code} completado`);
      }
      setSelectedAppointment(null);
      await refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo actualizar el turno ${appointment.code}`));
    }
  }

  const totalHours = window.end - window.start;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => window.start + i);

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Mi Agenda</h1>
          <p className={styles.subtitle}>Tu día, hora por hora</p>
        </div>
        <div className={styles.headerActions}>
          <AgendaViewSwitch />
          <Link to="/disponibilidad" className={styles.monthLink}>Editar horario</Link>
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
        <div className={styles.navRight}>
          {!isToday && (
            <button className={styles.todayBtn} onClick={goToToday}>
              Hoy
            </button>
          )}
          <Link to="/calendario" className={styles.monthLink}>Ver mes</Link>
        </div>
      </div>

      {/* ── Day briefing ── */}
      <section className={styles.briefing} aria-label="Resumen del día" aria-busy={loading || undefined}>
        {loading ? (
          <span className={styles.summaryText}>Cargando turnos...</span>
        ) : (
          <>
            <div className={styles.briefingBlock}>
              <span className={styles.briefingValue}>{active.length} <span className={styles.briefingLabel}>{active.length === 1 ? 'turno' : 'turnos'}{isToday ? ' hoy' : ''}</span></span>
              <div className={styles.chips}>
                {byStatus('PENDING') > 0 && <span className={`${styles.chip} ${styles.chipPending}`}>{byStatus('PENDING')} pendiente{byStatus('PENDING') === 1 ? '' : 's'}</span>}
                {byStatus('CONFIRMED') > 0 && <span className={`${styles.chip} ${styles.chipConfirmed}`}>{byStatus('CONFIRMED')} confirmado{byStatus('CONFIRMED') === 1 ? '' : 's'}</span>}
                {byStatus('COMPLETED') > 0 && <span className={`${styles.chip} ${styles.chipCompleted}`}>{byStatus('COMPLETED')} completado{byStatus('COMPLETED') === 1 ? '' : 's'}</span>}
                {byStatus('CANCELLED') > 0 && <span className={`${styles.chip} ${styles.chipCancelled}`}>{byStatus('CANCELLED')} cancelado{byStatus('CANCELLED') === 1 ? '' : 's'}</span>}
              </div>
            </div>

            <div className={styles.briefingBlock}>
              <span className={styles.briefingLabel}>Próximo</span>
              {nextAppointment && minutesToNext !== null ? (
                <span className={styles.briefingText}>
                  <strong>{nextAppointment.patient?.name ?? '—'}</strong> · {formatTime(nextAppointment.dateTime)}
                  <span className={styles.briefingMuted}> · {formatRelative(minutesToNext)}</span>
                </span>
              ) : (
                <span className={styles.briefingMuted}>{isToday ? 'Sin más turnos por hoy' : 'Sin turnos pendientes'}</span>
              )}
            </div>

            <div className={styles.briefingBlock}>
              <span className={styles.briefingLabel}>Atención</span>
              {dayBlocks.length === 0 ? (
                <span className={styles.briefingMuted}>No atendés este día</span>
              ) : (
                <span className={styles.briefingText}>
                  {dayBlocks.map((b) => `${b.startTime}–${b.endTime}`).join(' · ')}
                  <span className={styles.briefingMuted}> · {freeSlots} de {totalSlots} lugares libres</span>
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Timeline ── */}
      {!loading && appointments.length === 0 && (
        <p className={styles.emptyNote}>
          {dayBlocks.length === 0
            ? 'Sin turnos — no tenés disponibilidad configurada para este día.'
            : 'Sin turnos para este día. Los bloques sombreados son tu horario de atención.'}
        </p>
      )}
      {(
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
          <div className={styles.timelineGrid} style={{ height: `${totalHours * 60}px` }}>
            {/* Availability shading */}
            {dayBlocks.map((b) => (
              <div
                key={b.id}
                className={styles.availabilityBlock}
                style={{
                  top: `${minutesToPercent(toMinutes(b.startTime), window)}%`,
                  height: `${heightPercent(toMinutes(b.endTime) - toMinutes(b.startTime), window)}%`,
                }}
                aria-label={`Disponible ${b.startTime}–${b.endTime}`}
              />
            ))}

            {/* Hour grid lines */}
            {hours.map((h) => (
              <div
                key={h}
                className={styles.gridLine}
                style={{ top: `${((h - window.start) / totalHours) * 100}%` }}
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
              const top = topPercent(appt.dateTime, window);
              const height = Math.max(heightPercent(appt.durationMinutes, window), 3);
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
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAppointment(appt); } }}
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
