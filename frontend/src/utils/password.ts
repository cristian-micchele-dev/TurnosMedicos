/**
 * Mirrors the API's own floor (backend: users/domain/password-policy.ts).
 *
 * The browser only checks the length: the rest of the policy — common passwords,
 * keyboard runs, your own name — lives on the server, which is the only place it
 * cannot be skipped. What a form must never do is accept what the API will reject.
 */
export const MIN_PASSWORD_LENGTH = 10;

export const PASSWORD_HINT = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres — una frase larga es mejor que símbolos`;
