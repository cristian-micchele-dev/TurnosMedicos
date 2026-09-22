/**
 * The media type a file actually is, read from its first bytes.
 *
 * `file.mimetype` is whatever the browser wrote in the multipart header: the
 * client chooses it, so it is a claim, not a fact. A magic number is the file
 * telling us what it is.
 */
export type SniffedType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

const startsWith = (buffer: Buffer, signature: number[]) =>
  buffer.length >= signature.length && signature.every((byte, i) => buffer[i] === byte);

const ascii = (buffer: Buffer, offset: number, text: string) =>
  buffer.length >= offset + text.length && buffer.toString('latin1', offset, offset + text.length) === text;

export function sniffFileType(buffer: Buffer): SniffedType | null {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // A WebP is a RIFF container: the format only shows up at byte 8, and a WAV
  // starts exactly the same way.
  if (ascii(buffer, 0, 'RIFF') && ascii(buffer, 8, 'WEBP')) return 'image/webp';
  if (ascii(buffer, 0, '%PDF')) return 'application/pdf';
  return null;
}

export const EXTENSION_BY_TYPE: Record<SniffedType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
