import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from '../domain/user';
import { HASHER, Hasher } from '../../../shared/application/ports';
import { UserRepository } from '../user.repository.port';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

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
      new User(randomUUID(), email, dto.name ?? '', await this.hasher.hash(dto.password), dto.role),
    );
    return user.toPublic();
  }

  async findAll(pagination: PaginationDto = {}): Promise<PaginatedResult<ReturnType<User['toPublic']>>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [list, total] = await this.users.findAll({ skip, take: limit });
    return { data: list.map(u => u.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.role = dto.role;
    await this.users.update(user);
    return user.toPublic();
  }

  async toggleActive(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.active = !user.active;
    await this.users.update(user);
    return user.toPublic();
  }
}
