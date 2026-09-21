import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './adapters/http/auth.controller';
import { AuthService } from './application/auth.service';
import { TypeOrmSessionRepository, TypeOrmResetRepository } from './adapters/persistence/typeorm-auth.repository';
import { NoopMailer } from './adapters/mail/noop.mailer';
import { SESSION_REPOSITORY, RESET_REPOSITORY, MAILER } from './auth.repository.port';
import { AuthSessionOrmEntity, ResetTokenOrmEntity } from '../users/adapters/persistence/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSessionOrmEntity, ResetTokenOrmEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TypeOrmSessionRepository,
    TypeOrmResetRepository,
    NoopMailer,
    { provide: SESSION_REPOSITORY, useExisting: TypeOrmSessionRepository },
    { provide: RESET_REPOSITORY, useExisting: TypeOrmResetRepository },
    { provide: MAILER, useExisting: NoopMailer },
  ],
  exports: [SESSION_REPOSITORY, TypeOrmSessionRepository],
})
export class AuthModule {}
