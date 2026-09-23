import { MAX_FAILED_ATTEMPTS, isLocked, minutesLeft, registerFailure } from './account-lockout';

const now = new Date('2026-09-23T10:00:00.000Z');
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe('account-lockout', () => {
  it('los primeros errores no bloquean: equivocarse escribiendo es normal', () => {
    for (let previous = 0; previous < MAX_FAILED_ATTEMPTS - 1; previous++) {
      expect(registerFailure(previous, now).lockedUntil).toBeNull();
    }
  });

  it('al llegar al límite bloquea, y poco: un minuto mata el ataque y casi no molesta', () => {
    const { attempts, lockedUntil } = registerFailure(MAX_FAILED_ATTEMPTS - 1, now);
    expect(attempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(lockedUntil).toEqual(at(1));
  });

  it('insistir cuesta cada vez más, pero nunca para siempre', () => {
    expect(registerFailure(MAX_FAILED_ATTEMPTS, now).lockedUntil).toEqual(at(5));
    expect(registerFailure(MAX_FAILED_ATTEMPTS + 1, now).lockedUntil).toEqual(at(15));
    expect(registerFailure(MAX_FAILED_ATTEMPTS + 2, now).lockedUntil).toEqual(at(30));
    expect(registerFailure(MAX_FAILED_ATTEMPTS + 50, now).lockedUntil).toEqual(at(30));
  });

  it('isLocked mira el reloj, no el contador: el bloqueo vence solo', () => {
    expect(isLocked(at(1), now)).toBe(true);
    expect(isLocked(at(-1), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it('minutesLeft redondea para arriba: "0 minutos" no le sirve a nadie', () => {
    expect(minutesLeft(at(0.1), now)).toBe(1);
    expect(minutesLeft(at(4.2), now)).toBe(5);
    expect(minutesLeft(null, now)).toBe(0);
    expect(minutesLeft(at(-3), now)).toBe(0);
  });
});
