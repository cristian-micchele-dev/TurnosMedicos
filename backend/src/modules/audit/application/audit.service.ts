import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditEntry, AuditAction, AuditMetadata } from '../domain/audit-entry';
import { AuditRepository, AuditQuery, AUDIT_REPOSITORY } from '../audit.repository.port';
import { Actor } from '../../users/domain/actor';
import { Clock, CLOCK } from '../../../shared/application/ports';
import { PaginatedResult } from '../../../shared/application/pagination';

/** Keys that must never reach the trail, whatever the caller passes. */
const FORBIDDEN_KEYS = ['password', 'newpassword', 'currentpassword', 'temporarypassword', 'token', 'hash', 'diagnosis', 'notes', 'description'];

const MAX_VALUE_LENGTH = 200;

function sanitize(metadata: AuditMetadata): AuditMetadata {
  const clean: AuditMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.includes(key.toLowerCase())) continue;
    clean[key] = typeof value === 'string' && value.length > MAX_VALUE_LENGTH
      ? `${value.slice(0, MAX_VALUE_LENGTH - 1)}…`
      : value;
  }
  return clean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly entries: AuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Records and returns. It never throws: the trail exists to explain what the
   * system did, and a trail that can abort a consultation would be a worse
   * problem than the one it solves. A failed write is logged as an error so it
   * shows up in monitoring instead of disappearing.
   */
  async record(
    actor: Actor | null,
    action: AuditAction,
    targetType: string,
    targetId: string,
    metadata: AuditMetadata = {},
  ): Promise<void> {
    try {
      await this.entries.save(new AuditEntry(
        randomUUID(),
        this.clock.now(),
        actor?.sub ?? null,
        actor?.role ?? null,
        action,
        targetType,
        targetId,
        sanitize(metadata),
      ));
    } catch (error) {
      this.logger.error(`No se pudo registrar ${action} sobre ${targetType} ${targetId}`, error as Error);
    }
  }

  async findAll(query: AuditQuery & { page?: number; limit?: number } = {}): Promise<PaginatedResult<ReturnType<AuditEntry['toPublic']>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [list, total] = await this.entries.findAll({ ...query, skip: (page - 1) * limit, take: limit });
    return { data: list.map((e) => e.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
