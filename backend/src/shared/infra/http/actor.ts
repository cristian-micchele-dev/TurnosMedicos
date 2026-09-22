import { Request } from 'express';
import { Actor } from '../../../modules/users/domain/actor';

/**
 * The actor the JwtAuthGuard left on the request.
 *
 * Four controllers had their own copy of this line and two more reached for
 * \`(req as any).user\`, which is the same cast with the type turned off.
 */
export const actorOf = (req: Request): Actor => (req as Request & { user: Actor }).user;
