import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import { User } from '../domain/user';
import { HASHER, Hasher } from '../../../shared/application/ports';
import { UserRepository } from '../user.repository.port';
import { SESSION_REPOSITORY, SessionRepository } from '../../auth/auth.repository.port';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

// Unambiguous alphabet: no 0/O, 1/l/I — the admin reads this aloud or copies it once.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TEMP_PASSWORD_LENGTH = 12;

function generateTemporaryPassword(): string {
  return Array.from({ length: TEMP_PASSWORD_LENGTH }, () => TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)]).join('');
}

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
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

  // The temporary password is returned exactly once and never stored in clear.
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    const temporaryPassword = generateTemporaryPassword();
    user.passwordHash = await this.hasher.hash(temporaryPassword);
    user.mustChangePassword = true;
    await this.users.update(user);
    await this.sessions.revokeAllForUser(user.id);
    return { temporaryPassword };
  }

  async toggleActive(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.active = !user.active;
    await this.users.update(user);
    return user.toPublic();
  }
}
