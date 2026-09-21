import { Module } from '@nestjs/common';
import { UserController } from './adapters/http/user.controller';
import { UserService } from './application/user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UsersModule {}
