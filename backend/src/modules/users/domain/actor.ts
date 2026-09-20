import { Role } from './user';

/** Authenticated identity as carried by the access token: user id + role. */
export interface Actor {
  sub: string;
  role: Role;
}
