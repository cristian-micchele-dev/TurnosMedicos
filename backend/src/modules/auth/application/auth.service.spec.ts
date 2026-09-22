import { AuthService } from './auth.service';
import { Role, User } from '../../users/domain/user';
import { createHash } from 'crypto';

describe('AuthService', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const user = new User('u1', 'x@y.com', '', 'hash:good', Role.DOCTOR);
  const users: any = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn(), update: jest.fn() };
  const hasher: any = { hash: jest.fn(async (value: string) => `hash:${value}`), verify: jest.fn(async (hash: string, value: string) => hash === `hash:${value}`) };
  const tokens: any = { signAccess: jest.fn(() => 'access'), signRefresh: jest.fn(() => 'refresh'), verifyRefresh: jest.fn(() => ({ jti: 'j1', familyId: 'f1' })), refreshTtlMs: () => 1000 };
  const sessions: any = { save: jest.fn(), findByJti: jest.fn(), rotate: jest.fn(), revoke: jest.fn(), revokeFamily: jest.fn(), revokeAllForUser: jest.fn() };
  const resets: any = { save: jest.fn(), consume: jest.fn() };
  const mailer: any = { sendPasswordReset: jest.fn() };
  const service = () => new AuthService(users, hasher, tokens, sessions, resets, mailer, { now: () => now });
  beforeEach(() => { jest.clearAllMocks(); users.findByEmail.mockResolvedValue(undefined); users.findById.mockResolvedValue(undefined); });

  it('no expone auto-registro: el alta de usuarios es exclusiva del admin', () => {
    expect((service() as any).register).toBeUndefined();
  });

  describe('recordarme', () => {
    const DAY = 86400000;
    beforeEach(() => { users.findByEmail.mockResolvedValue(user); tokens.rememberTtlMs = () => 30 * DAY; });

    it('sin recordarme: sesión no persistente con el TTL normal de refresh', async () => {
      const result = await service().login({ email: 'x@y.com', password: 'good' });
      expect(result.persistent).toBe(false);
      const session = sessions.save.mock.calls[0][0];
      expect(session.persistent).toBe(false);
      expect(session.expiresAt.getTime()).toBe(now.getTime() + 1000);
      expect(tokens.signRefresh).toHaveBeenCalledWith(expect.any(Object), undefined);
    });

    it('con recordarme: sesión persistente de 30 días y refresh JWT con el mismo vencimiento', async () => {
      const result = await service().login({ email: 'x@y.com', password: 'good', rememberMe: true });
      expect(result.persistent).toBe(true);
      expect(result.expiresAt.getTime()).toBe(now.getTime() + 30 * DAY);
      const session = sessions.save.mock.calls[0][0];
      expect(session.persistent).toBe(true);
      expect(session.expiresAt.getTime()).toBe(now.getTime() + 30 * DAY);
      expect(tokens.signRefresh).toHaveBeenCalledWith(expect.any(Object), 30 * DAY);
    });

    it('la rotación de refresh conserva la persistencia de la sesión original', async () => {
      users.findById.mockResolvedValue(user);
      sessions.findByJti.mockResolvedValue({ id: 's1', userId: 'u1', familyId: 'f1', tokenHash: createHash('sha256').update('refresh').digest('hex'), expiresAt: new Date(now.getTime() + DAY), persistent: true });
      sessions.rotate.mockResolvedValue(true);
      const result = await service().refresh('refresh');
      expect(result.persistent).toBe(true);
      expect(sessions.save.mock.calls[0][0].persistent).toBe(true);
    });
  });

  it('emite sesión al autenticar y rechaza usuario inactivo', async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service().login({ email: 'X@Y.COM', password: 'good' })).resolves.toMatchObject({ accessToken: 'access', refreshToken: 'refresh' });
    user.active = false;
    await expect(service().login({ email: 'x@y.com', password: 'good' })).rejects.toMatchObject({ status: 401 });
    user.active = true;
  });
  it('mantiene respuesta anti-enumeración',async()=>await expect(service().forgot('none@example.com')).resolves.toEqual({message:expect.stringContaining('Si el correo existe')}));
  it('envía recovery sólo para usuarios existentes y normaliza el correo', async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service().forgot(' X@Y.COM ')).resolves.toEqual({ message: expect.stringContaining('Si el correo existe') });
    expect(resets.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', tokenHash: expect.any(String) }));
    expect(mailer.sendPasswordReset).toHaveBeenCalledWith('x@y.com', expect.any(String));
  });
  it('rechaza login uniforme',async()=>await expect(service().login({email:'x@y.com',password:'bad'})).rejects.toMatchObject({status:401}));
  it('detecta reuse y revoca la familia', async () => {
    const user={id:'u1',email:'x@y.com',passwordHash:'hash',role:'DOCTOR',active:true,toPublic:()=>({id:'u1'})};
    const sessions:any={findByJti:async()=>({id:'s1',userId:'u1',familyId:'f1',tokenHash:'other',expiresAt:new Date(Date.now()+10000)}),revokeFamily:jest.fn()};
    const tokens:any={verifyRefresh:()=>({jti:'j1',familyId:'f1'})};
    const instance=new AuthService(users,{} as any,tokens,sessions,{} as any,{} as any,{now:()=>new Date()});
    users.findById.mockResolvedValue(user);
    await expect(instance.refresh('stolen')).rejects.toMatchObject({status:401});
    expect(sessions.revokeFamily).toHaveBeenCalledWith('f1');
  });

  it('rechaza refresh expirado, sin sesión o con usuario inactivo', async () => {
    tokens.verifyRefresh.mockReturnValue({ jti: 'j1', familyId: 'f1' });
    sessions.findByJti.mockResolvedValue({ id: 's1', userId: 'u1', familyId: 'f1', tokenHash: createHash('sha256').update('refresh').digest('hex'), expiresAt: new Date('2025-01-01') });
    await expect(service().refresh('refresh')).rejects.toMatchObject({ status: 401 });
    sessions.findByJti.mockResolvedValue(undefined);
    await expect(service().refresh('refresh')).rejects.toMatchObject({ status: 401 });
  });

  it('hace logout idempotente y exige usuario existente en me', async () => {
    sessions.findByJti.mockResolvedValue({ id: 's1', revokedAt: undefined });
    await expect(service().logout('refresh')).resolves.toBeUndefined();
    expect(sessions.revoke).toHaveBeenCalledWith('s1');
    await expect(service().logout('')).resolves.toBeUndefined();
    await expect(service().me('missing')).rejects.toMatchObject({ status: 401 });
    users.findById.mockResolvedValue(user);
    await expect(service().me('u1')).resolves.toMatchObject({ id: 'u1', email: 'x@y.com' });
  });

  describe('changePassword (usuario autenticado)', () => {
    it('verifica la actual, guarda la nueva, limpia mustChangePassword, revoca sesiones y emite tokens nuevos', async () => {
      const u = new User('u1', 'x@y.com', '', 'hash:temp', Role.DOCTOR);
      u.mustChangePassword = true;
      users.findById.mockResolvedValue(u);

      const result = await service().changePassword('u1', { currentPassword: 'temp', newPassword: 'mi-clave-definitiva' });

      expect(u.passwordHash).toBe('hash:mi-clave-definitiva');
      expect(u.mustChangePassword).toBe(false);
      expect(users.update).toHaveBeenCalledWith(u);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
      expect(result).toMatchObject({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('rechaza si la contraseña actual no coincide', async () => {
      users.findById.mockResolvedValue(new User('u1', 'x@y.com', '', 'hash:temp', Role.DOCTOR));
      await expect(service().changePassword('u1', { currentPassword: 'wrong', newPassword: 'mi-clave-definitiva' })).rejects.toMatchObject({ status: 401 });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rechaza reutilizar la misma contraseña', async () => {
      users.findById.mockResolvedValue(new User('u1', 'x@y.com', '', 'hash:same', Role.DOCTOR));
      await expect(service().changePassword('u1', { currentPassword: 'same', newPassword: 'same' })).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza usuario inexistente', async () => {
      await expect(service().changePassword('ghost', { currentPassword: 'a', newPassword: 'bbbbbbbb' })).rejects.toMatchObject({ status: 401 });
    });
  });

  it('consume reset una sola vez, cambia password e invalida sesiones', async () => {
    resets.consume.mockResolvedValue({ userId: 'u1' });
    users.findById.mockResolvedValue(user);
    await expect(service().reset({ token: 'token', password: 'brida correcta 9' })).resolves.toEqual({ message: 'Contraseña actualizada' });
    expect(users.update).toHaveBeenCalled();
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
    resets.consume.mockResolvedValue(undefined);
    await expect(service().reset({ token: 'token', password: 'brida correcta 9' })).rejects.toMatchObject({ status: 401 });
  });
});
