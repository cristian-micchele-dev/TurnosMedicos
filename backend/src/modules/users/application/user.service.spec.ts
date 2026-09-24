import { UserService } from './user.service';
import { Role, User } from '../domain/user';
import type { Actor } from '../domain/actor';

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

describe('UserService — nadie se saca a sí mismo del sistema', () => {
  const users: any = { findById: jest.fn(), findByEmail: jest.fn(), findAll: jest.fn(), save: jest.fn(), update: jest.fn() };
  const hasher: any = { hash: jest.fn(async (v: string) => `hash:${v}`) };
  const sessions: any = { revokeAllForUser: jest.fn() };
  const audit: any = { record: jest.fn() };
  const service = () => new UserService(audit, users, hasher, sessions);

  const yo: Actor = { sub: 'admin-1', role: Role.ADMIN };
  const otro: Actor = { sub: 'admin-2', role: Role.ADMIN };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findById.mockResolvedValue(new User('admin-1', 'jefe@h.com', 'Jefe', 'hash', Role.ADMIN));
  });

  it('un admin no puede cambiarse el rol a sí mismo: sería quedarse afuera de un portazo', async () => {
    await expect(service().updateRole('admin-1', { role: Role.DOCTOR }, yo)).rejects.toMatchObject({ status: 409 });
    expect(users.update).not.toHaveBeenCalled();
  });

  it('un admin no puede desactivarse a sí mismo', async () => {
    await expect(service().toggleActive('admin-1', yo)).rejects.toMatchObject({ status: 409 });
    expect(users.update).not.toHaveBeenCalled();
  });

  // Si nadie puede sacarse a sí mismo, siempre queda alguien: el último admin es
  // justamente el que no tiene quién se lo haga.
  it('a otro sí: cambiarle el rol a un colega sigue siendo trabajo del admin', async () => {
    await service().updateRole('admin-1', { role: Role.DOCTOR }, otro);
    expect(users.update).toHaveBeenCalled();
  });

  it('a otro sí: desactivar a un colega sigue funcionando', async () => {
    await service().toggleActive('admin-1', otro);
    expect(users.update).toHaveBeenCalled();
  });

  it('resetearse la clave a uno mismo tampoco: para eso está cambiar contraseña', async () => {
    await expect(service().resetPassword('admin-1', yo)).rejects.toMatchObject({ status: 409 });
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });
});
