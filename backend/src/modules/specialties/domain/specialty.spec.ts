import { Specialty } from './specialty';

describe('Specialty', () => {
  it('crea con valores por defecto', () => {
    const s = new Specialty('id-1', 'Cardiología');
    expect(s.id).toBe('id-1');
    expect(s.name).toBe('Cardiología');
    expect(s.description).toBeNull();
    expect(s.active).toBe(true);
    expect(s.createdAt).toBeInstanceOf(Date);
  });

  it('trimea el nombre en el constructor', () => {
    const s = new Specialty('id-2', '  Neurología  ');
    expect(s.name).toBe('Neurología');
  });

  it('toPublic retorna la proyección pública', () => {
    const s = new Specialty('id-1', 'Dermatología', 'Piel y mucosas', true);
    const pub = s.toPublic();
    expect(pub).toEqual({ id: 'id-1', name: 'Dermatología', description: 'Piel y mucosas', active: true, createdAt: s.createdAt });
  });
});
