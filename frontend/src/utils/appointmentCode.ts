/**
 * Turns "cancelá el TM-00012" into something clickable.
 *
 * Nobody has to learn a syntax: the code is what the staff already writes when
 * they talk about a turno, so recognising it is enough to close the distance
 * between the conversation and the appointment it is about.
 */

/** Exactly five digits, and not glued to another word: ATM-00012 is not a turno. */
const CODE = /(?<![A-Za-z0-9])(TM-\d{5})(?![0-9])/gi;

export const isAppointmentCode = (value: string): boolean => /^TM-\d{5}$/i.test(value.trim());

export interface CodePart {
  type: 'text' | 'code';
  value: string;
}

export function splitAppointmentCodes(text: string): CodePart[] {
  const parts: CodePart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CODE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, start) });
    parts.push({ type: 'code', value: match[0].toUpperCase() });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
