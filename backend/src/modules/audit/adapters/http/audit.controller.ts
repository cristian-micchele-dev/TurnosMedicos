import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { AuditService } from '../../application/audit.service';
import { AuditAction } from '../../domain/audit-entry';
import { PaginationDto } from '../../../../shared/application/pagination';

export class AuditQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsUUID() targetId?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

/** Reading the trail is itself an administrative act: only ADMIN, and never a write. */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(@Query() query: AuditQueryDto) {
    return this.service.findAll({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
