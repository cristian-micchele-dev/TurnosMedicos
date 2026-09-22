import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../domain/user';
import { UserService } from '../../application/user.service';
import { CreateUserDto } from '../../application/dto/create-user.dto';
import { UpdateRoleDto } from '../../application/dto/update-role.dto';
import { PaginationDto } from '../../../../shared/application/pagination';
import { actorOf } from '../../../../shared/infra/http/actor';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.service.create(dto, actorOf(req));
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Patch(':id/role')
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto, @Req() req: Request) {
    return this.service.updateRole(id, dto, actorOf(req));
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.toggleActive(id, actorOf(req));
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.resetPassword(id, actorOf(req));
  }
}
