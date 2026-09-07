import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService, TOKEN_SERVICE } from '../../../../shared/application/ports';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/errors';
import { Role } from '../../../../modules/users/domain/user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
    try {
      const payload = this.tokens.verifyAccess(header.slice(7));
      if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') throw new Error('invalid claims');
      request.user = payload;
      return true;
    } catch { throw new UnauthorizedError(); }
  }
}

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenError();
    return true;
  }
}
