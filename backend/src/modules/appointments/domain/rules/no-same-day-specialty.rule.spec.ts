import { NoSameDaySpecialtyRule } from './no-same-day-specialty.rule';
import { Appointment } from '../appointment';
import { AppointmentStatus } from '../appointment-status.enum';

describe('NoSameDaySpecialtyRule', () => {
  const rule = new NoSameDaySpecialtyRule();
  const dt = new Date('2026-09-07T10:00:00Z');

  it('pasa si no hay turnos del paciente en esa especialidad ese día', async () => {
    const repo: any = { findByPatientSpecialtyAndDateRange: jest.fn().mockResolvedValue([]) };
    await expect(rule.validate('p1', 's1', dt, repo)).resolves.toBeUndefined();
  });

  it('pasa si los existentes están cancelados', async () => {
    const cancelled = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.CANCELLED);
    const repo: any = { findByPatientSpecialtyAndDateRange: jest.fn().mockResolvedValue([cancelled]) };
    await expect(rule.validate('p1', 's1', dt, repo)).resolves.toBeUndefined();
  });

  it('falla si hay un turno activo del paciente en esa especialidad ese día', async () => {
    const existing = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.CONFIRMED);
    const repo: any = { findByPatientSpecialtyAndDateRange: jest.fn().mockResolvedValue([existing]) };
    await expect(rule.validate('p1', 's1', dt, repo)).rejects.toMatchObject({ status: 409 });
  });

  it('ignora el turno excluido', async () => {
    const existing = new Appointment('a1', 'd1', 'p1', 's1', dt, 30, AppointmentStatus.CONFIRMED);
    const repo: any = { findByPatientSpecialtyAndDateRange: jest.fn().mockResolvedValue([existing]) };
    await expect(rule.validate('p1', 's1', dt, repo, 'a1')).resolves.toBeUndefined();
  });
});
