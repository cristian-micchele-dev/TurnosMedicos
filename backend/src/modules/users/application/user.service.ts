import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from '../domain/user';
import { HASHER, Hasher } from '../../../shared/application/ports';
import { UserRepository } from '../user.repository.port';
import { SESSION_REPOSITORY, SessionRepository } from '../../auth/auth.repository.port';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';
import { assertStrongPassword, generateTemporaryPassword } from '../domain/password-policy';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit-entry';
import { Actor } from '../domain/actor';

// Unambiguous alphabet: no 0/O, 1/l/I — the admin reads this aloud or copies it once.
@Injectable()
export class UserService {
  constructor(
    private readonly audit: AuditService,
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async create(dto: CreateUserDto, actor: Actor) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    assertStrongPassword(dto.password, { email, name: dto.name });
    const user = await this.users.save(
      new User(randomUUID(), email, dto.name ?? '', await this.hasher.hash(dto.password), dto.role),
    );
    await this.audit.record(actor, AuditAction.USER_CREATED, 'user', user.id, { role: user.role });
    return user.toPublic();
  }

  async findAll(pagination: PaginationDto = {}): Promise<PaginatedResult<ReturnType<User['toPublic']>>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [list, total] = await this.users.findAll({ skip, take: limit });
    return { data: list.map(u => u.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Nadie se administra a sí mismo.
   *
   * No es paternalismo: es lo que garantiza que el sistema nunca se quede sin
   * administrador. Si nadie puede sacarse a sí mismo el rol ni desactivarse, el
   * último admin que queda es justamente el que no tiene quién se lo haga. Sin
   * esta regla, un solo clic distraído deja la clínica sin quien administre y
   * sin forma de recuperarla que no sea entrar a la base a mano.
   */
  private assertNotSelf(id: string, actor: Actor, accion: string): void {
    if (id !== actor.sub) return;
    throw new ConflictException(`No podés ${accion} tu propia cuenta. Pedíselo a otro administrador.`);
  }

  async updateRole(id: string, dto: UpdateRoleDto, actor: Actor) {
    this.assertNotSelf(id, actor, 'cambiarle el rol a');
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    const previous = user.role;
    user.role = dto.role;
    await this.users.update(user);
    await this.audit.record(actor, AuditAction.USER_ROLE_CHANGED, 'user', user.id, { from: previous, to: user.role });
    return user.toPublic();
  }

  // The temporary password is returned exactly once and never stored in clear.
  async resetPassword(id: string, actor: Actor): Promise<{ temporaryPassword: string }> {
    // Para la propia hay "cambiar contraseña", que pide la actual.
    this.assertNotSelf(id, actor, 'resetearle la clave a');
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    const temporaryPassword = generateTemporaryPassword();
    user.passwordHash = await this.hasher.hash(temporaryPassword);
    user.mustChangePassword = true;
    await this.users.update(user);
    await this.sessions.revokeAllForUser(user.id);
    // The temporary password itself never reaches the trail — only that it happened.
    await this.audit.record(actor, AuditAction.USER_PASSWORD_RESET, 'user', user.id);
    return { temporaryPassword };
  }

  async toggleActive(id: string, actor: Actor) {
    this.assertNotSelf(id, actor, 'activar o desactivar');
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    user.active = !user.active;
    await this.users.update(user);
    // Desactivar es echar, no marcar una casilla. El access token vive 15 minutos
    // y no los revisa nadie: sin esto, alguien recién dado de baja sigue leyendo
    // historias clínicas un rato más. Reactivar no cierra nada: no hay a quién echar.
    if (!user.active) await this.sessions.revokeAllForUser(user.id);
    await this.audit.record(actor, AuditAction.USER_ACTIVE_CHANGED, 'user', user.id, { active: user.active });
    return user.toPublic();
  }
}
