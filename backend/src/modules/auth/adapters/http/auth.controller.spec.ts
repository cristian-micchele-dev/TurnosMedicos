import { AuthController } from './auth.controller';
describe('AuthController', () => {
  it('emite cookies seguras y no acepta refresh sin double-submit CSRF', async () => {
    const service: any = { login: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }), refresh: jest.fn() };
    const controller = new AuthController(service);
    const response: any = { cookie: jest.fn(), clearCookie: jest.fn() };
    await expect(controller.login({ email: 'x@y.com', password: 'password' } as any, response)).resolves.toEqual({ accessToken: 'access' });
    expect(response.cookie).toHaveBeenCalledTimes(2);
    const request: any = { headers: {}, cookies: {} };
    await expect(controller.refresh(request, response)).rejects.toBeDefined();
    expect(service.refresh).not.toHaveBeenCalled();
  });
  it('refresh funciona con CSRF válido', async () => {
    const service: any = { refresh: jest.fn().mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }) };
    const controller = new AuthController(service);
    const response: any = { cookie: jest.fn() };
    const request: any = { headers: { 'x-csrf-token': 'csrf-value' }, cookies: { csrf_token: 'csrf-value', refresh_token: 'old-refresh' } };
    await expect(controller.refresh(request, response)).resolves.toEqual({ accessToken: 'new-access' });
    expect(service.refresh).toHaveBeenCalledWith('old-refresh');
  });

  it('register delega al service', async () => {
    const service: any = { register: jest.fn().mockResolvedValue({ id: 'u1', email: 'x@y.com' }) };
    const controller = new AuthController(service);
    await expect(controller.register({ email: 'x@y.com', password: 'pass' } as any)).resolves.toMatchObject({ id: 'u1' });
  });

  it('me delega al service', async () => {
    const service: any = { me: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const controller = new AuthController(service);
    await expect(controller.me({ user: { sub: 'u1' } } as any)).resolves.toMatchObject({ id: 'u1' });
  });

  it('forgot delega al service', async () => {
    const service: any = { forgot: jest.fn().mockResolvedValue({ message: 'ok' }) };
    const controller = new AuthController(service);
    await expect(controller.forgot({ email: 'x@y.com' } as any)).resolves.toMatchObject({ message: 'ok' });
  });

  it('reset delega al service', async () => {
    const service: any = { reset: jest.fn().mockResolvedValue({ message: 'ok' }) };
    const controller = new AuthController(service);
    await expect(controller.reset({ token: 't', password: 'new' } as any)).resolves.toMatchObject({ message: 'ok' });
  });

  it('limpia refresh y csrf al cerrar sesión', async () => {
    const response: any = { clearCookie: jest.fn() };
    await new AuthController({ logout: jest.fn() } as any).logout({ cookies: {} } as any, response);
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });
});
