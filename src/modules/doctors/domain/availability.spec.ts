import { Availability } from './availability';

describe('Availability', () => {
  it('genera slots correctamente para un bloque de 2 horas con slots de 30min', () => {
    const a = new Availability('a1', 'd1', 1, '09:00', '11:00', 30);
    expect(a.generateSlots()).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('genera slots de 45min sin incluir slot que exceda el fin', () => {
    const a = new Availability('a1', 'd1', 1, '09:00', '11:00', 45);
    expect(a.generateSlots()).toEqual(['09:00', '09:45']);
  });

  it('retorna vacío si el bloque es menor al slot', () => {
    const a = new Availability('a1', 'd1', 1, '09:00', '09:20', 30);
    expect(a.generateSlots()).toEqual([]);
  });

  it('toPublic retorna la proyección correcta', () => {
    const a = new Availability('a1', 'd1', 3, '14:00', '18:00', 30);
    expect(a.toPublic()).toEqual({ id: 'a1', doctorId: 'd1', dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 });
  });
});
