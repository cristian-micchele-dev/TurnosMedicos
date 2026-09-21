// "Laura Gómez" → "LG"; "ana" → "A"; falls back to the email's first letter.
export function initialsOf(name: string | null | undefined, fallback = ''): string {
  const source = (name ?? '').trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 1) : parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1);
  return letters.toUpperCase();
}
