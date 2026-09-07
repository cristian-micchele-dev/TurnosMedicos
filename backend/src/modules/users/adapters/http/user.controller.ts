import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../domain/user';
import { UserService } from '../../application/user.service';
import { UpdateRoleDto } from '../../application/dto/update-role.dto';


@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/role')
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.service.updateRole(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleActive(id);
  }
}
