import { attachment } from './content-disposition';

describe('attachment (Content-Disposition)', () => {
  it('propone el nombre original cuando es inocuo', () => {
    expect(attachment('informe.pdf')).toBe(`attachment; filename="informe.pdf"; filename*=UTF-8''informe.pdf`);
  });

  // Lo que importa no es que el texto hostil desaparezca —puede quedar como parte
  // del nombre—, sino que no pueda cerrar la comilla ni abrir otro parámetro.
  it('no deja que unas comillas cierren el parámetro e inventen otro', () => {
    const header = attachment('a".pdf"; filename="hackeado.exe');
    expect(header.match(/filename="/g)).toHaveLength(1);
    const quoted = header.match(/filename="([^"]*)"/)![1];
    expect(quoted).not.toMatch(/["\\;]/);
  });

  it('no deja inyectar una cabecera nueva con un salto de línea', () => {
    const header = attachment('informe.pdf\r\nSet-Cookie: admin=1');
    expect(header).not.toMatch(/[\r\n]/);
  });

  it('conserva el nombre real con acentos en la forma codificada, que sí los admite', () => {
    const header = attachment('ecografía año 2026.pdf');
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('ecografía año 2026.pdf')}`);
    // El ASCII de respaldo nunca queda vacío, aunque el nombre sea todo no-ASCII.
    expect(attachment('検査.pdf')).toMatch(/filename="[^"]+"/);
  });
});
