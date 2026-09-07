import { WithinAvailabilityRule } from './within-availability.rule';
import { Availability } from '../../../doctors/domain/availability';

describe('WithinAvailabilityRule', () => {
  const rule = new WithinAvailabilityRule();

  it('pasa si el horario está dentro de un bloque', async () => {
    const block = new Availability('a1', 'd1', 1, '09:00', '17:00', 30); // lunes
    const repo: any = { findByDoctorAndDay: jest.fn().mockResolvedValue([block]) };
    // 2026-09-07 es lunes UTC
    await expect(rule.validate('d1', new Date('2026-09-07T10:00:00Z'), repo)).resolves.toBeUndefined();
  });

  it('falla si no hay disponibilidad ese día', async () => {
    const repo: any = { findByDoctorAndDay: jest.fn().mockResolvedValue([]) };
    await expect(rule.validate('d1', new Date('2026-09-07T10:00:00Z'), repo)).rejects.toMatchObject({ status: 400 });
  });

  it('falla si el horario está fuera del bloque', async () => {
    const block = new Availability('a1', 'd1', 1, '09:00', '12:00', 30);
    const repo: any = { findByDoctorAndDay: jest.fn().mockResolvedValue([block]) };
    await expect(rule.validate('d1', new Date('2026-09-07T14:00:00Z'), repo)).rejects.toMatchObject({ status: 400 });
  });

  it('falla si el horario coincide exactamente con endTime', async () => {
    const block = new Availability('a1', 'd1', 1, '09:00', '12:00', 30);
    const repo: any = { findByDoctorAndDay: jest.fn().mockResolvedValue([block]) };
    await expect(rule.validate('d1', new Date('2026-09-07T12:00:00Z'), repo)).rejects.toMatchObject({ status: 400 });
  });
});
