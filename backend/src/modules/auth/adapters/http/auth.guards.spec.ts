import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from './auth.guards';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../users/domain/user';

const context = (request: any): ExecutionContext => ({ switchToHttp: () => ({ getRequest: () => request }), getHandler: () => undefined, getClass: () => undefined } as any);
describe('guards de autenticación', () => {
  it('rechaza ausencia y acepta bearer con claims', () => {
    const token = { verifyAccess: jest.fn().mockReturnValue({ sub: 'u1', role: Role.DOCTOR }) } as any;
    const guard = new JwtAuthGuard(token);
    expect(() => guard.canActivate(context({ headers: {} }))).toThrow();
    const request: any = { headers: { authorization: 'Bearer good' } };
    expect(guard.canActivate(context(request))).toBe(true);
    expect(request.user.sub).toBe('u1');
  });
  it('autoriza sólo el rol declarado', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(context({ user: { role: Role.DOCTOR } }))).toThrow();
    expect(guard.canActivate(context({ user: { role: Role.ADMIN } }))).toBe(true);
  });
});
