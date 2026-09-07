import { Patient } from './patient';

describe('Patient', () => {
  it('crea con valores por defecto', () => {
    const p = new Patient('p1', 'u1');
    expect(p.phone).toBeNull();
    expect(p.dateOfBirth).toBeNull();
    expect(p.active).toBe(true);
  });

  it('toPublic retorna la proyección correcta', () => {
    const p = new Patient('p1', 'u1', '1155667788', '1990-05-15', 'Av. Siempreviva 742', 'OS-123');
    const pub = p.toPublic();
    expect(pub).toMatchObject({ id: 'p1', userId: 'u1', phone: '1155667788', dateOfBirth: '1990-05-15', insuranceNumber: 'OS-123' });
  });
});
