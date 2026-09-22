import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/adapters/http/auth.guards';
import { actorOf } from '../../../../shared/infra/http/actor';
import { NotificationService } from '../../application/notification.service';
import { PaginationDto } from '../../../../shared/application/pagination';

export class InboxQueryDto extends PaginationDto {
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() unreadOnly?: boolean;
}

/** Everyone reads their own inbox; there is no endpoint to read someone else's. */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  inbox(@Query() query: InboxQueryDto, @Req() req: Request) {
    return this.service.inbox(actorOf(req).sub, query);
  }

  @Patch(':id/read') @HttpCode(204)
  markRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.markRead(id, actorOf(req).sub);
  }

  @Patch('read-all') @HttpCode(204)
  markAllRead(@Req() req: Request) {
    return this.service.markAllRead(actorOf(req).sub);
  }
}
