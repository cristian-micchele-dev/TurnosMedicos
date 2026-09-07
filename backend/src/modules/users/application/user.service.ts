import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role, User } from '../domain/user';
import { HASHER, Hasher } from '../../../shared/application/ports';
import { UserRepository } from '../user.repository.port';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
  ) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const user = await this.users.save(
      new User(randomUUID(), email, dto.name ?? '', await this.hasher.hash(dto.password), dto.role ?? Role.PATIENT),
    );
    return user.publicia();
  }

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
