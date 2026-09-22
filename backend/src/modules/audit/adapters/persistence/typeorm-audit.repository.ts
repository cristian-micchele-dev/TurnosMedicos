import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditRepository, AuditQuery } from '../../audit.repository.port';
import { AuditEntry } from '../../domain/audit-entry';
import { AuditLogOrmEntity } from './audit.entity';

@Injectable()
export class TypeOrmAuditRepository implements AuditRepository {
  constructor(@InjectRepository(AuditLogOrmEntity) private readonly repo: Repository<AuditLogOrmEntity>) {}

  private map(e: AuditLogOrmEntity): AuditEntry {
    return new AuditEntry(e.id, e.occurredAt, e.actorId, e.actorRole, e.action, e.targetType, e.targetId, e.metadata ?? {});
  }

  async save(entry: AuditEntry): Promise<void> {
    await this.repo.insert({
      id: entry.id,
      occurredAt: entry.occurredAt,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
    });
  }

  async findAll(query: AuditQuery = {}): Promise<[AuditEntry[], number]> {
    const qb = this.repo.createQueryBuilder('a');
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.actorId) qb.andWhere('a.actor_id = :actorId', { actorId: query.actorId });
    if (query.targetId) qb.andWhere('a.target_id = :targetId', { targetId: query.targetId });
    if (query.from) qb.andWhere('a.occurred_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.occurred_at <= :to', { to: query.to });

    const [rows, total] = await qb
      .orderBy('a.occurred_at', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();

    return [rows.map((r) => this.map(r)), total];
  }
}
