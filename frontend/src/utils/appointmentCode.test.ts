import { splitAppointmentCodes } from './appointmentCode';

describe('splitAppointmentCodes', () => {
  it('encuentra el código en medio de una frase', () => {
    expect(splitAppointmentCodes('Cancelá el TM-00012 por favor')).toEqual([
      { type: 'text', value: 'Cancelá el ' },
      { type: 'code', value: 'TM-00012' },
      { type: 'text', value: ' por favor' },
    ]);
  });

  it('reconoce el código escrito en minúscula y lo normaliza', () => {
    const parts = splitAppointmentCodes('mové el tm-00007');
    expect(parts[1]).toEqual({ type: 'code', value: 'TM-00007' });
  });

  it('encuentra varios códigos en el mismo mensaje', () => {
    const codes = splitAppointmentCodes('TM-00001 y TM-00002 los cancelo').filter((p) => p.type === 'code');
    expect(codes.map((c) => c.value)).toEqual(['TM-00001', 'TM-00002']);
  });

  it('un texto sin códigos vuelve entero, en una sola parte', () => {
    expect(splitAppointmentCodes('Hoy me voy 17hs')).toEqual([{ type: 'text', value: 'Hoy me voy 17hs' }]);
  });

  it('no confunde algo que se le parece: TM sin cinco dígitos no es un turno', () => {
    expect(splitAppointmentCodes('TM-123 no existe')).toEqual([{ type: 'text', value: 'TM-123 no existe' }]);
    expect(splitAppointmentCodes('ATM-00012')).toEqual([{ type: 'text', value: 'ATM-00012' }]);
  });

  it('un código pegado a un signo de puntuación se reconoce igual', () => {
    const parts = splitAppointmentCodes('¿El TM-00012?');
    expect(parts.map((p) => p.value)).toEqual(['¿El ', 'TM-00012', '?']);
  });
});
