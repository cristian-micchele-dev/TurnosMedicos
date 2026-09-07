import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '../domain/user';
import { UserRepository } from '../user.repository.port';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UserService {
  constructor(@Inject('USER_REPOSITORY') private readonly users: UserRepository) {}

  async findAll() {
    const list = await this.users.findAll();
    return list.map(u => u.publicia());
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.role = dto.role;
    await this.users.update(user);
    return user.publicia();
  }

  async toggleActive(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.active = !user.active;
    await this.users.update(user);
    return user.publicia();
  }
}
