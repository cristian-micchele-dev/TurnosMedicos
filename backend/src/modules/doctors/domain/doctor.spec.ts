import { Doctor } from './doctor';

describe('Doctor', () => {
  it('crea con valores por defecto', () => {
    const d = new Doctor('d1', 'u1', 's1', 'MP-1234');
    expect(d.active).toBe(true);
    expect(d.phone).toBeNull();
  });

  it('toPublic retorna la proyección correcta', () => {
    const d = new Doctor('d1', 'u1', 's1', 'MP-1234', '1155667788');
    const pub = d.toPublic();
    expect(pub).toMatchObject({ id: 'd1', userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-1234', phone: '1155667788' });
  });

  it('nace sin foto y toPublic la expone como avatarFile null', () => {
    const d = new Doctor('d1', 'u1', 's1', 'MP-1234');
    expect(d.avatarFile).toBeNull();
    expect(d.toPublic().avatarFile).toBeNull();
  });

  it('lanza error si licenseNumber está vacío', () => {
    expect(() => new Doctor('d1', 'u1', 's1', '')).toThrow();
    expect(() => new Doctor('d1', 'u1', 's1', '   ')).toThrow();
  });
});
