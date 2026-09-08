import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { Argon2Hasher, JwtTokenService } from './infra/crypto/services';
import { SystemClock } from './infra/time/system-clock';
import { HASHER, TOKEN_SERVICE, CLOCK } from './application/ports';
import { TypeOrmUserRepository } from '../modules/users/adapters/persistence/typeorm-user.repository';
import { UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity } from '../modules/users/adapters/persistence/entities';
import { JwtAuthGuard, RolesGuard } from '../modules/auth/adapters/http/auth.guards';
import { ProblemDetailsFilter } from './infra/http/problem-details.filter';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity]),
  ],
  providers: [
    Argon2Hasher,
    JwtTokenService,
    SystemClock,
    TypeOrmUserRepository,
    { provide: 'USER_REPOSITORY', useExisting: TypeOrmUserRepository },
    { provide: HASHER, useExisting: Argon2Hasher },
    { provide: TOKEN_SERVICE, useExisting: JwtTokenService },
    { provide: CLOCK, useExisting: SystemClock },
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
  exports: [
    TypeOrmUserRepository,
    'USER_REPOSITORY',
    HASHER,
    TOKEN_SERVICE,
    CLOCK,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class SharedModule {}
