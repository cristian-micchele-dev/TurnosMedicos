/**
 * Bloqueo temporal de una cuenta por intentos fallidos.
 *
 * El throttler del controlador frena una ráfaga desde UNA IP. Esto es otra cosa:
 * protege a una cuenta concreta aunque el ataque venga repartido entre mil IPs,
 * porque el contador vive con el usuario y no con la conexión.
 *
 * El bloqueo es temporal y creciente, nunca permanente. NIST SP 800-63B advierte
 * justamente contra el bloqueo duro: un atacante que no puede entrar igual puede
 * dejar afuera a un médico el día que lo necesita. Un minuto ya hace inviable la
 * fuerza bruta (de miles de intentos por minuto a decenas por hora); el resto de
 * la escalera es para el que insiste.
 */

/** Errores tolerados antes del primer bloqueo. Tipear mal la clave es normal. */
export const MAX_FAILED_ATTEMPTS = 5;

/** Minutos de bloqueo del 5.º error en adelante. El último valor es el techo. */
const LOCK_MINUTES = [1, 5, 15, 30];

export interface FailureOutcome {
  attempts: number;
  lockedUntil: Date | null;
}

/** Registra un intento fallido y dice si la cuenta queda bloqueada, y hasta cuándo. */
export function registerFailure(previousAttempts: number, now: Date): FailureOutcome {
  const attempts = previousAttempts + 1;
  if (attempts < MAX_FAILED_ATTEMPTS) return { attempts, lockedUntil: null };
  const step = Math.min(attempts - MAX_FAILED_ATTEMPTS, LOCK_MINUTES.length - 1);
  return { attempts, lockedUntil: new Date(now.getTime() + LOCK_MINUTES[step] * 60_000) };
}

/** El bloqueo vence solo: lo decide el reloj, no un administrador. */
export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}

/** Para decirle a la persona cuánto falta. Hacia arriba: "0 minutos" no le sirve a nadie. */
export function minutesLeft(lockedUntil: Date | null, now: Date): number {
  if (!isLocked(lockedUntil, now)) return 0;
  return Math.ceil((lockedUntil!.getTime() - now.getTime()) / 60_000);
}
