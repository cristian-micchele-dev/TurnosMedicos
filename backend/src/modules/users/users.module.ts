import { Module } from '@nestjs/common';
import { UserController } from './adapters/http/user.controller';
import { UserService } from './application/user.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UsersModule {}
