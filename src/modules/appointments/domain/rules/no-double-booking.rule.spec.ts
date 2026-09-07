import { NoDoubleBookingRule } from './no-double-booking.rule';
import { Appointment } from '../appointment';
import { AppointmentStatus } from '../appointment-status.enum';

describe('NoDoubleBookingRule', () => {
  const rule = new NoDoubleBookingRule();
  const dt = new Date('2026-09-07T10:00:00Z');

  it('pasa si no hay turnos existentes', async () => {
    const repo: any = { findByDoctorAndDateTime: jest.fn().mockResolvedValue([]) };
    await expect(rule.validate('d1', dt, repo)).resolves.toBeUndefined();
  });

  it('pasa si todos los existentes están cancelados', async () => {
    const cancelled = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.CANCELLED);
    const repo: any = { findByDoctorAndDateTime: jest.fn().mockResolvedValue([cancelled]) };
    await expect(rule.validate('d1', dt, repo)).resolves.toBeUndefined();
  });

  it('falla si hay un turno activo en ese horario', async () => {
    const existing = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.PENDING);
    const repo: any = { findByDoctorAndDateTime: jest.fn().mockResolvedValue([existing]) };
    await expect(rule.validate('d1', dt, repo)).rejects.toMatchObject({ status: 409 });
  });

  it('ignora el turno excluido (para updates)', async () => {
    const existing = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.PENDING);
    const repo: any = { findByDoctorAndDateTime: jest.fn().mockResolvedValue([existing]) };
    await expect(rule.validate('d1', dt, repo, 'a1')).resolves.toBeUndefined();
  });
});
