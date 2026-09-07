import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { HealthController } from './health.controller';
import { AuthController } from './modules/auth/adapters/http/auth.controller';
import { JwtAuthGuard, RolesGuard } from './modules/auth/adapters/http/auth.guards';
import { AuthService } from './modules/auth/application/auth.service';
import { DatabaseModule } from './database/typeorm.module';
import { UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity } from './modules/users/adapters/persistence/entities';
import { TypeOrmUserRepository } from './modules/users/adapters/persistence/typeorm-user.repository';
import { TypeOrmSessionRepository, TypeOrmResetRepository } from './modules/auth/adapters/persistence/typeorm-auth.repository';
import { NoopMailer } from './modules/auth/adapters/mail/noop.mailer';
import { Argon2Hasher, JwtTokenService } from './shared/infra/crypto/services';
import { SystemClock } from './shared/infra/time/system-clock';
import { HASHER, TOKEN_SERVICE, CLOCK } from './shared/application/ports';
import { SESSION_REPOSITORY, RESET_REPOSITORY, MAILER } from './modules/auth/ports/repositories';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: 'postgres', url: config.getOrThrow('databaseUrl'), entities: [UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity], synchronize: false }) }), DatabaseModule],
  controllers: [HealthController, AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, Argon2Hasher, JwtTokenService, SystemClock, TypeOrmUserRepository, TypeOrmSessionRepository, TypeOrmResetRepository, NoopMailer,
    { provide: 'USER_REPOSITORY', useExisting: TypeOrmUserRepository }, { provide: HASHER, useExisting: Argon2Hasher }, { provide: TOKEN_SERVICE, useExisting: JwtTokenService }, { provide: CLOCK, useExisting: SystemClock }, { provide: SESSION_REPOSITORY, useExisting: TypeOrmSessionRepository }, { provide: RESET_REPOSITORY, useExisting: TypeOrmResetRepository }, { provide: MAILER, useExisting: NoopMailer }],
})
export class AppModule {}
