import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from './adapters/http/message.controller';
import { MessageService } from './application/message.service';
import { TypeOrmMessageRepository } from './adapters/persistence/typeorm-message.repository';
import { MESSAGE_REPOSITORY } from './message.repository.port';
import { MessageOrmEntity } from './adapters/persistence/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageOrmEntity])],
  controllers: [MessageController],
  providers: [
    MessageService,
    TypeOrmMessageRepository,
    { provide: MESSAGE_REPOSITORY, useExisting: TypeOrmMessageRepository },
  ],
  exports: [MessageService],
})
export class MessagesModule {}
