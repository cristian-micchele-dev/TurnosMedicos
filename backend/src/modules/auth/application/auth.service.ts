import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DomainError, UnauthorizedError } from '../../../shared/domain/errors';
import { CLOCK as CLOCK_TOKEN, Clock, HASHER, Hasher, TOKEN_SERVICE, TokenService } from '../../../shared/application/ports';
import { UserRepository } from '../../users/user.repository.port';
import { User } from '../../users/domain/user';
import { ChangePasswordDto, LoginDto, ResetPasswordDto } from '../../users/application/dto/auth.dto';
import { MailerPort, MAILER, RESET_REPOSITORY, ResetRepository, SESSION_REPOSITORY, SessionRepository } from '../auth.repository.port';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(@Inject('USER_REPOSITORY') private readonly users: UserRepository, @Inject(HASHER) private readonly hasher: Hasher, @Inject(TOKEN_SERVICE) private readonly tokens: TokenService, @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository, @Inject(RESET_REPOSITORY) private readonly resets: ResetRepository, @Inject(MAILER) private readonly mailer: MailerPort, @Inject(CLOCK_TOKEN) private readonly clock: Clock) {}
  private async issue(user: User, familyId: string = randomUUID()) { const jti = randomUUID(); const refreshToken = this.tokens.signRefresh({ sub: user.id, jti, familyId }); await this.sessions.save({ id: randomUUID(), userId: user.id, familyId, tokenHash: sha(refreshToken), jti, expiresAt: new Date(this.clock.now().getTime() + (this.tokens.refreshTtlMs?.() ?? 7 * 86400000)) }); return { accessToken: this.tokens.signAccess({ sub: user.id, role: user.role }), refreshToken }; }
  async login(dto: LoginDto) { const user = await this.users.findByEmail(dto.email.trim().toLowerCase()); if (!user || !user.active || !(await this.hasher.verify(user.passwordHash, dto.password))) throw new UnauthorizedError(); return this.issue(user); }
  async refresh(raw: string) { try { if (!raw) throw new UnauthorizedError(); const payload = this.tokens.verifyRefresh(raw); const session = await this.sessions.findByJti(String(payload.jti)); if (!session || session.familyId !== String(payload.familyId) || session.revokedAt || session.expiresAt <= this.clock.now() || session.tokenHash !== sha(raw)) { if (session) await this.sessions.revokeFamily(session.familyId); throw new UnauthorizedError(); } const user = await this.users.findById(session.userId); if (!user?.active) throw new UnauthorizedError(); const replacement = await this.issue(user, session.familyId); const replacementPayload = this.tokens.verifyRefresh(replacement.refreshToken); if (!await this.sessions.rotate(session.id, sha(raw), String(replacementPayload.jti), this.clock.now())) { await this.sessions.revokeFamily(session.familyId); throw new UnauthorizedError(); } return replacement; } catch (error) { if (error instanceof UnauthorizedError) throw error; throw new UnauthorizedError(); } }
  async logout(raw?: string) { if (!raw) return; try { const payload = this.tokens.verifyRefresh(raw); const session = await this.sessions.findByJti(String(payload.jti)); if (session && !session.revokedAt) await this.sessions.revoke(session.id); } catch { /* idempotente */ } }
  async me(id: string) { const user = await this.users.findById(id); if (!user) throw new UnauthorizedError(); return user.toPublic(); }
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findById(userId);
    if (!user || !user.active || !(await this.hasher.verify(user.passwordHash, dto.currentPassword))) throw new UnauthorizedError();
    if (dto.currentPassword === dto.newPassword) throw new DomainError('PASSWORD_REUSED', 'La nueva contraseña debe ser distinta a la actual', 400);
    user.passwordHash = await this.hasher.hash(dto.newPassword);
    user.mustChangePassword = false;
    await this.users.update(user);
    await this.sessions.revokeAllForUser(user.id);
    return this.issue(user);
  }
  async forgot(email: string) { const user = await this.users.findByEmail(email.trim().toLowerCase()); if (user) { const token = randomBytes(32).toString('base64url'); await this.resets.save({ id: randomUUID(), userId: user.id, tokenHash: sha(token), expiresAt: new Date(this.clock.now().getTime() + 3600000) }); await this.mailer.sendPasswordReset(user.email, token); } return { message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña' }; }
  async reset(dto: ResetPasswordDto) { const token = await this.resets.consume(sha(dto.token), this.clock.now()); if (!token) throw new UnauthorizedError(); const user = await this.users.findById(token.userId); if (!user) throw new UnauthorizedError(); user.passwordHash = await this.hasher.hash(dto.password); await this.users.update(user); await this.sessions.revokeAllForUser(user.id); return { message: 'Contraseña actualizada' }; }
}
