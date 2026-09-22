/**
 * A Content-Disposition header that survives a hostile file name.
 *
 * The original name comes from the client, and it lands inside a quoted header
 * parameter: a quote closes that parameter and a CRLF starts a whole new header.
 * So the ASCII fallback is stripped down to safe characters, and the real name
 * travels in the RFC 5987 form, which is percent-encoded and cannot break out.
 */
export function attachment(originalName: string): string {
  const name = (originalName || 'archivo').replace(/[\r\n]/g, '');

  const ascii = name
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\;]/g, '_')
    .trim() || 'archivo';

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
