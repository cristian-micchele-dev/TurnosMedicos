import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuthSession, ResetRepository, ResetToken, SessionRepository } from '../../ports/repositories';
import { AuthSessionOrmEntity, ResetTokenOrmEntity } from '../../../users/adapters/persistence/entities';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(@InjectRepository(AuthSessionOrmEntity) private readonly repository: Repository<AuthSessionOrmEntity>) {}
  async save(session: AuthSession) { await this.repository.save(Object.assign(new AuthSessionOrmEntity(), session)); }
  async findByJti(jti: string) { return this.repository.findOne({ where: { jti } }) as Promise<AuthSession | undefined>; }
  async rotate(id: string, tokenHash: string, replacedBy: string, now: Date) {
    const result = await this.repository.update({ id, tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(now) }, { revokedAt: now, replacedBy });
    return (result.affected ?? 0) === 1;
  }
  async revoke(id: string, replacedBy?: string) { await this.repository.update(id, { revokedAt: new Date(), replacedBy }); }
  async revokeFamily(familyId: string) { await this.repository.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() }); }
  async revokeAllForUser(userId: string) { await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() }); }
}

@Injectable()
export class TypeOrmResetRepository implements ResetRepository {
  constructor(@InjectRepository(ResetTokenOrmEntity) private readonly repository: Repository<ResetTokenOrmEntity>) {}
  async save(token: ResetToken) { await this.repository.save(Object.assign(new ResetTokenOrmEntity(), token)); }
  async consume(hash: string, now: Date) {
    const token = await this.repository.findOne({ where: { tokenHash: hash, usedAt: IsNull(), expiresAt: MoreThan(now) } });
    if (!token) return undefined;
    const result = await this.repository.update({ id: token.id, usedAt: IsNull(), expiresAt: MoreThan(now) }, { usedAt: now });
    return (result.affected ?? 0) === 1 ? token as ResetToken : undefined;
  }
}
