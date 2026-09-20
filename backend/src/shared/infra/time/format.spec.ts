import { clinicDayRange, clinicLocalToUtc, toClinicClock } from './format';

describe('clinic clock helpers (America/Argentina/Buenos_Aires, UTC-3)', () => {
  it('toClinicClock proyecta un instante UTC al reloj del hospital', () => {
    expect(toClinicClock(new Date('2026-09-21T12:00:00Z'))).toEqual({ dayOfWeek: 1, time: '09:00' });
    // martes 01:00Z es lunes 22:00 en BA
    expect(toClinicClock(new Date('2026-09-22T01:00:00Z'))).toEqual({ dayOfWeek: 1, time: '22:00' });
    // medianoche local
    expect(toClinicClock(new Date('2026-09-22T03:00:00Z'))).toEqual({ dayOfWeek: 2, time: '00:00' });
  });

  it('clinicLocalToUtc construye el instante UTC de una hora local', () => {
    expect(clinicLocalToUtc('2026-09-21', '09:00').toISOString()).toBe('2026-09-21T12:00:00.000Z');
    expect(clinicLocalToUtc('2026-09-21', '23:30').toISOString()).toBe('2026-09-22T02:30:00.000Z');
  });

  it('clinicDayRange cubre el día completo del hospital', () => {
    const { start, end } = clinicDayRange('2026-09-21');
    expect(start.toISOString()).toBe('2026-09-21T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-22T02:59:59.999Z');
  });
});
