import { sniffFileType } from './sniff';

const bytes = (...values: number[]) => Buffer.from(values);
const png = () => Buffer.concat([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), Buffer.alloc(16)]);
const jpeg = () => Buffer.concat([bytes(0xff, 0xd8, 0xff, 0xe0), Buffer.alloc(16)]);
const webp = () => Buffer.concat([Buffer.from('RIFF'), bytes(0, 0, 0, 0), Buffer.from('WEBP'), Buffer.alloc(16)]);
const pdf = () => Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(16)]);

describe('sniffFileType', () => {
  it('reconoce los formatos que aceptamos por sus primeros bytes', () => {
    expect(sniffFileType(png())).toBe('image/png');
    expect(sniffFileType(jpeg())).toBe('image/jpeg');
    expect(sniffFileType(webp())).toBe('image/webp');
    expect(sniffFileType(pdf())).toBe('application/pdf');
  });

  it('no se deja engañar por lo que el cliente declara: un ejecutable sigue siendo desconocido', () => {
    // 'MZ' — cabecera de un .exe de Windows, enviado como image/png.
    expect(sniffFileType(Buffer.concat([Buffer.from('MZ'), Buffer.alloc(32)]))).toBeNull();
  });

  it('un archivo vacío o recortado no es de ningún tipo', () => {
    expect(sniffFileType(Buffer.alloc(0))).toBeNull();
    expect(sniffFileType(bytes(0x89, 0x50))).toBeNull();
  });

  it('RIFF sin WEBP no es webp: un .wav no entra por la puerta de las imágenes', () => {
    const wav = Buffer.concat([Buffer.from('RIFF'), bytes(0, 0, 0, 0), Buffer.from('WAVE'), Buffer.alloc(16)]);
    expect(sniffFileType(wav)).toBeNull();
  });
});
