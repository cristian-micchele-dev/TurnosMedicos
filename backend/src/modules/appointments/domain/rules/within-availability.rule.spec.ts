import { WithinAvailabilityRule } from './within-availability.rule';
import { Availability } from '../../../doctors/domain/availability';

// Availability blocks are expressed in the clinic's local time (America/Argentina/Buenos_Aires, UTC-3).
// Instants arrive in UTC; the rule must compare them on the clinic clock.
describe('WithinAvailabilityRule', () => {
  const rule = new WithinAvailabilityRule();
  const repoWith = (blocks: Availability[]): any => ({ findByDoctorAndDay: jest.fn().mockResolvedValue(blocks) });

  it('pasa si el instante cae dentro del bloque en hora del hospital', async () => {
    const block = new Availability('a1', 'd1', 1, '08:00', '12:00', 30); // lunes
    // 2026-09-21T12:00:00Z = lunes 09:00 en Buenos Aires
    await expect(rule.validate('d1', new Date('2026-09-21T12:00:00Z'), repoWith([block]))).resolves.toBeUndefined();
  });

  it('usa el día de la semana del hospital, no el UTC', async () => {
    const block = new Availability('a1', 'd1', 1, '20:00', '23:00', 30); // lunes noche
    const repo = repoWith([block]);
    // 2026-09-22T01:00:00Z es martes en UTC pero lunes 22:00 en Buenos Aires
    await expect(rule.validate('d1', new Date('2026-09-22T01:00:00Z'), repo)).resolves.toBeUndefined();
    expect(repo.findByDoctorAndDay).toHaveBeenCalledWith('d1', 1);
  });

  it('falla si no hay disponibilidad ese día', async () => {
    await expect(rule.validate('d1', new Date('2026-09-21T12:00:00Z'), repoWith([]))).rejects.toMatchObject({ status: 400 });
  });

  it('falla si el horario está fuera del bloque', async () => {
    const block = new Availability('a1', 'd1', 1, '08:00', '12:00', 30);
    // 2026-09-21T17:00:00Z = lunes 14:00 BA
    await expect(rule.validate('d1', new Date('2026-09-21T17:00:00Z'), repoWith([block]))).rejects.toMatchObject({ status: 400 });
  });

  it('falla si el horario coincide exactamente con endTime', async () => {
    const block = new Availability('a1', 'd1', 1, '08:00', '12:00', 30);
    // 2026-09-21T15:00:00Z = lunes 12:00 BA
    await expect(rule.validate('d1', new Date('2026-09-21T15:00:00Z'), repoWith([block]))).rejects.toMatchObject({ status: 400 });
  });

  it('acepta turno de tarde en un segundo bloque del mismo día', async () => {
    const morning = new Availability('a1', 'd1', 1, '08:00', '12:00', 30);
    const afternoon = new Availability('a2', 'd1', 1, '16:30', '20:00', 30);
    // 2026-09-21T20:00:00Z = lunes 17:00 BA
    await expect(rule.validate('d1', new Date('2026-09-21T20:00:00Z'), repoWith([morning, afternoon]))).resolves.toBeUndefined();
  });
});
