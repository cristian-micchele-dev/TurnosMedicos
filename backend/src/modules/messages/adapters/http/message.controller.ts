import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/adapters/http/auth.guards';
import { actorOf } from '../../../../shared/infra/http/actor';
import { MessageService } from '../../application/message.service';
import { MAX_MESSAGE_LENGTH } from '../../domain/message';
import { PaginationDto } from '../../../../shared/application/pagination';

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(MAX_MESSAGE_LENGTH) body!: string;
}

/**
 * Everything here is scoped to whoever is asking: there is no endpoint that
 * takes two user ids, so nobody can read a conversation they are not in.
 */
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get('conversations')
  conversations(@Req() req: Request) {
    return this.service.conversations(actorOf(req));
  }

  @Get('contacts')
  contacts(@Req() req: Request) {
    return this.service.contacts(actorOf(req));
  }

  @Get('unread')
  async unread(@Req() req: Request) {
    return { unread: await this.service.countUnread(actorOf(req)) };
  }

  @Get(':userId')
  thread(@Param('userId', ParseUUIDPipe) userId: string, @Query() pagination: PaginationDto, @Req() req: Request) {
    return this.service.thread(actorOf(req), userId, pagination);
  }

  @Post(':userId')
  send(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: SendMessageDto, @Req() req: Request) {
    return this.service.send(actorOf(req), userId, dto.body);
  }
}
