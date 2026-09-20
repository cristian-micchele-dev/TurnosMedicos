import { Patient } from './patient';

describe('Patient', () => {
  it('crea con valores por defecto', () => {
    const p = new Patient('p1', 'Ana Pérez');
    expect(p.email).toBeNull();
    expect(p.phone).toBeNull();
    expect(p.dateOfBirth).toBeNull();
    expect(p.active).toBe(true);
  });

  it('toPublic retorna la proyección correcta sin acoplarse a User', () => {
    const p = new Patient('p1', 'Ana Pérez', 'ana@test.com', '1155667788', '1990-05-15', 'Av. Siempreviva 742', 'OS-123');
    const pub = p.toPublic();
    expect(pub).toMatchObject({ id: 'p1', name: 'Ana Pérez', email: 'ana@test.com', phone: '1155667788', dateOfBirth: '1990-05-15', insuranceNumber: 'OS-123' });
    expect(pub).not.toHaveProperty('userId');
    expect(pub).not.toHaveProperty('user');
  });
});
