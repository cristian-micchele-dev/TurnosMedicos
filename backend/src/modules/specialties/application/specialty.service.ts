import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConflictError } from '../../../shared/domain/errors';
import { Specialty } from '../domain/specialty';
import { SpecialtyNotFoundError } from '../domain/specialty-not-found.exception';
import { SpecialtyRepository, SPECIALTY_REPOSITORY } from '../specialty.repository.port';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

@Injectable()
export class SpecialtyService {
  constructor(@Inject(SPECIALTY_REPOSITORY) private readonly specialties: SpecialtyRepository) {}

  async create(dto: CreateSpecialtyDto) {
    const name = dto.name.trim();
    if (await this.specialties.findByName(name)) throw new ConflictError('Ya existe una especialidad con ese nombre');
    const specialty = new Specialty(randomUUID(), name, dto.description?.trim() ?? null);
    return (await this.specialties.save(specialty)).toPublic();
  }

  async findAll(onlyActive = true, pagination: PaginationDto = {}): Promise<PaginatedResult<ReturnType<Specialty['toPublic']>>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [list, total] = await this.specialties.findAll(onlyActive, { skip, take: limit });
    return { data: list.map(s => s.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const s = await this.specialties.findById(id);
    if (!s) throw new SpecialtyNotFoundError(id);
    return s.toPublic();
  }

  async update(id: string, dto: UpdateSpecialtyDto) {
    const s = await this.specialties.findById(id);
    if (!s) throw new SpecialtyNotFoundError(id);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const existing = await this.specialties.findByName(name);
      if (existing && existing.id !== id) throw new ConflictError('Ya existe una especialidad con ese nombre');
      s.name = name;
    }
    if (dto.description !== undefined) s.description = dto.description?.trim() ?? null;
    if (dto.active !== undefined) s.active = dto.active;
    await this.specialties.update(s);
    return s.toPublic();
  }

  async remove(id: string) {
    const s = await this.specialties.findById(id);
    if (!s) throw new SpecialtyNotFoundError(id);
    s.active = false;
    await this.specialties.update(s);
  }
}
