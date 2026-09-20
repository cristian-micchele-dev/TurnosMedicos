import { seedAdmin } from './seed-admin';
import { Role, User } from '../modules/users/domain/user';

describe('seedAdmin', () => {
  const users: any = { findByEmail: jest.fn(), save: jest.fn(async (u: User) => u) };
  const hasher: any = { hash: jest.fn(async (v: string) => `hash:${v}`) };
  beforeEach(() => { jest.clearAllMocks(); users.findByEmail.mockResolvedValue(undefined); });

  it('crea el ADMIN con email normalizado y password hasheada', async () => {
    const result = await seedAdmin({ users, hasher }, { email: ' Admin@Hospital.COM ', password: 'super-secreta-1', name: 'Admin' });
    expect(result).toBe('created');
    const saved: User = users.save.mock.calls[0][0];
    expect(saved.email).toBe('admin@hospital.com');
    expect(saved.role).toBe(Role.ADMIN);
    expect(saved.passwordHash).toBe('hash:super-secreta-1');
    expect(saved.name).toBe('Admin');
  });

  it('es idempotente: si el email ya existe no crea nada', async () => {
    users.findByEmail.mockResolvedValue(new User('u1', 'admin@hospital.com', 'Admin', 'hash', Role.ADMIN));
    const result = await seedAdmin({ users, hasher }, { email: 'admin@hospital.com', password: 'super-secreta-1', name: 'Admin' });
    expect(result).toBe('exists');
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza password corta (misma regla que CreateUserDto)', async () => {
    await expect(seedAdmin({ users, hasher }, { email: 'a@b.com', password: 'corta', name: 'x' })).rejects.toThrow(/8/);
  });

  it('rechaza email inválido', async () => {
    await expect(seedAdmin({ users, hasher }, { email: 'no-es-email', password: 'super-secreta-1', name: 'x' })).rejects.toThrow(/email/i);
  });
});
