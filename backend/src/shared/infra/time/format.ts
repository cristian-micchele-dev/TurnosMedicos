/** Time zone used for every human-facing date/time string. Server clocks are UTC; patients are not. */
export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString('es-AR', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });

export const formatDateTime = (date: Date): string =>
  date.toLocaleString('es-AR', { timeZone: APP_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const clinicParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Projects a UTC instant onto the clinic wall clock: weekday (0=Sunday) and HH:mm. */
export function toClinicClock(date: Date): { dayOfWeek: number; time: string } {
  const parts = Object.fromEntries(clinicParts.formatToParts(date).map(p => [p.type, p.value]));
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return { dayOfWeek: WEEKDAY_INDEX[parts.weekday], time: `${hour}:${parts.minute}` };
}

const offsetParts = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, timeZoneName: 'longOffset' });

/** Builds the UTC instant for a calendar date + HH:mm[:ss] read on the clinic wall clock. */
export function clinicLocalToUtc(dateIso: string, time: string): Date {
  const probe = new Date(`${dateIso}T${time}Z`);
  const offset = offsetParts.formatToParts(probe).find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const iso = offset === 'GMT' ? 'Z' : offset.replace('GMT', '');
  return new Date(`${dateIso}T${time}${iso}`);
}

/** Start and end instants of a clinic calendar day. */
export function clinicDayRange(dateIso: string): { start: Date; end: Date } {
  return { start: clinicLocalToUtc(dateIso, '00:00:00'), end: clinicLocalToUtc(dateIso, '23:59:59.999') };
}
