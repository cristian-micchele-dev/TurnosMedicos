import { UserService } from './user.service';
import { Role, User } from '../domain/user';

describe('UserService', () => {
  const users: any = { findById: jest.fn(), findByEmail: jest.fn(), findAll: jest.fn(), save: jest.fn(), update: jest.fn() };
  const hasher: any = { hash: jest.fn(async (v: string) => `hash:${v}`), verify: jest.fn() };
  const sessions: any = { revokeAllForUser: jest.fn() };
  const audit: any = { record: jest.fn() };
  const admin = { sub: 'u-admin', role: Role.ADMIN };
  const service = () => new UserService(audit, users, hasher, sessions);

  beforeEach(() => {
    jest.clearAllMocks();
    users.findById.mockResolvedValue(undefined);
    users.findByEmail.mockResolvedValue(undefined);
  });

  describe('resetPassword (admin)', () => {
    it('genera una clave temporal, la hashea, marca mustChangePassword y revoca sesiones', async () => {
      const user = new User('u1', 'doc@h.com', 'Doc', 'hash:old', Role.DOCTOR);
      users.findById.mockResolvedValue(user);

      const result = await service().resetPassword('u1', admin);

      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
      expect(hasher.hash).toHaveBeenCalledWith(result.temporaryPassword);
      expect(user.passwordHash).toBe(`hash:${result.temporaryPassword}`);
      expect(user.mustChangePassword).toBe(true);
      expect(users.update).toHaveBeenCalledWith(user);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
    });

    it('cada reset genera una clave distinta', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@h.com', 'Doc', 'hash', Role.DOCTOR));
      const a = await service().resetPassword('u1', admin);
      const b = await service().resetPassword('u1', admin);
      expect(a.temporaryPassword).not.toBe(b.temporaryPassword);
    });

    it('lanza 404 si el usuario no existe', async () => {
      await expect(service().resetPassword('missing', admin)).rejects.toMatchObject({ status: 404 });
    });
  });

  it('toPublic expone mustChangePassword', () => {
    const user = new User('u1', 'a@b.com', 'A', 'h', Role.ADMIN);
    expect(user.toPublic()).toMatchObject({ mustChangePassword: false });
    user.mustChangePassword = true;
    expect(user.toPublic()).toMatchObject({ mustChangePassword: true });
  });
});
