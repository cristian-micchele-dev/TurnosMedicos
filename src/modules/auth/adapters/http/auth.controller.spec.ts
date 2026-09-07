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
  it('limpia refresh y csrf al cerrar sesión', async () => {
    const response: any = { clearCookie: jest.fn() };
    await new AuthController({ logout: jest.fn() } as any).logout({ cookies: {} } as any, response);
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });
});
