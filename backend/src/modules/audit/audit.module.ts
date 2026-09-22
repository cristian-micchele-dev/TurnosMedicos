import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './adapters/http/audit.controller';
import { AuditService } from './application/audit.service';
import { TypeOrmAuditRepository } from './adapters/persistence/typeorm-audit.repository';
import { AUDIT_REPOSITORY } from './audit.repository.port';
import { AuditLogOrmEntity } from './adapters/persistence/audit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogOrmEntity])],
  controllers: [AuditController],
  providers: [
    AuditService,
    TypeOrmAuditRepository,
    { provide: AUDIT_REPOSITORY, useExisting: TypeOrmAuditRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
