import { CancellationWindowRule } from './cancellation-window.rule';

describe('CancellationWindowRule', () => {
  const rule = new CancellationWindowRule();

  it('pasa si faltan más de 24h para el turno', () => {
    const appointment = new Date('2026-09-10T10:00:00Z');
    const now = new Date('2026-09-09T09:00:00Z'); // 25h antes
    expect(() => rule.validate(appointment, now)).not.toThrow();
  });

  it('falla si faltan menos de 24h', () => {
    const appointment = new Date('2026-09-10T10:00:00Z');
    const now = new Date('2026-09-09T11:00:00Z'); // 23h antes
    expect(() => rule.validate(appointment, now)).toThrow();
  });

  it('falla si el turno ya pasó', () => {
    const appointment = new Date('2026-09-08T10:00:00Z');
    const now = new Date('2026-09-10T10:00:00Z');
    expect(() => rule.validate(appointment, now)).toThrow();
  });

  it('permite exactamente en el límite de 24h', () => {
    const appointment = new Date('2026-09-10T10:00:00Z');
    const now = new Date('2026-09-09T10:00:00Z'); // exactamente 24h
    expect(() => rule.validate(appointment, now)).not.toThrow();
  });

  it('falla con 1 segundo menos que 24h', () => {
    const appointment = new Date('2026-09-10T10:00:00Z');
    const now = new Date('2026-09-09T10:00:01Z'); // 23h 59m 59s
    expect(() => rule.validate(appointment, now)).toThrow();
  });
});
