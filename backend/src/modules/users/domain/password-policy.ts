import { randomInt } from 'crypto';
import { DomainError } from '../../../shared/domain/errors';

export class WeakPasswordError extends DomainError {
  constructor(reason: string) { super('WEAK_PASSWORD', reason, 400); }
}

export const MIN_PASSWORD_LENGTH = 10;

/**
 * NIST SP 800-63B, not folklore: length and a blocklist beat composition rules.
 * Demanding an uppercase, a digit and a symbol produces "P@ssw0rd1" — long in
 * characters, three guesses wide. So we ask for length, and we refuse the
 * passwords an attacker tries first.
 */
const COMMON = [
  'password', 'contrasena', 'contraseña', 'qwerty', 'qwertyuiop', 'asdfghjkl',
  'iloveyou', 'admin', 'administrador', 'welcome', 'bienvenido', 'letmein',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  'abc123', 'password1', 'passw0rd', 'secret', 'changeme', 'default',
  // The context an attacker knows about this system before trying anything.
  'pulso', 'turnomed', 'hospital', 'clinica', 'medico', 'doctor', 'turnos',
];

const KEYBOARD_RUNS = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiopasdfghjklzxcvbnm'];

// "Pulso-2026!" and "pulso2026" are the same guess: compare on letters and digits only.
const normalize = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Each word of the person's identity on its own: "Laura Gómez" has to catch
// "gomezgomez11", so the split happens before normalising — which is what eats
// the separators.
function identityWords(context?: { email?: string; name?: string }): string[] {
  const source = `${context?.email?.split('@')[0] ?? ''} ${context?.name ?? ''}`;
  return source
    .split(/[\s._+-]+/)
    .map((part) => normalize(part).replace(/[0-9]/g, ''))
    .filter((word) => word.length >= 4);
}

// Six characters in a row are enough to call it a sequence: "12345678910" is not
// saved by its trailing digit, and a real passphrase never contains one.
const RUN_LENGTH = 6;

function isRepeatedOrSequential(normalized: string): boolean {
  if (/^(.)\1+$/.test(normalized)) return true;
  for (const run of KEYBOARD_RUNS) {
    const reversed = [...run].reverse().join('');
    for (let i = 0; i + RUN_LENGTH <= normalized.length; i++) {
      const chunk = normalized.slice(i, i + RUN_LENGTH);
      if (run.includes(chunk) || reversed.includes(chunk)) return true;
    }
  }
  return false;
}

export function assertStrongPassword(password: string, context?: { email?: string; name?: string }): void {
  const value = password ?? '';
  if (value.trim().length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  const normalized = normalize(value);

  if (isRepeatedOrSequential(normalized)) {
    throw new WeakPasswordError('La contraseña no puede ser una secuencia ni un carácter repetido');
  }

  // Strip digits before matching so "Password123" and "pulso2026pulso" are caught too.
  const letters = normalized.replace(/[0-9]/g, '');
  if (COMMON.some((common) => letters === common || letters === common + common || (common.length >= 5 && letters.includes(common)))) {
    throw new WeakPasswordError('Esa contraseña es demasiado común; elegí una frase que solo vos uses');
  }

  if (identityWords(context).some((word) => letters.includes(word))) {
    throw new WeakPasswordError('La contraseña no puede contener tu nombre ni tu email');
  }
}

const TEMP_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TEMP_LENGTH = 14;

/** Read aloud once and typed once: no look-alike characters, and it passes our own policy. */
export function generateTemporaryPassword(): string {
  for (;;) {
    const candidate = Array.from({ length: TEMP_LENGTH }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join('');
    try {
      assertStrongPassword(candidate);
      return candidate;
    } catch {
      // Astronomically unlikely, but a generator that can emit a rejected password is a bug.
    }
  }
}
