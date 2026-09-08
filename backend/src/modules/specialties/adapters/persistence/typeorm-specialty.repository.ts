import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialtyRepository } from '../../specialty.repository.port';
import { Specialty } from '../../domain/specialty';
import { SpecialtyOrmEntity } from './specialty.entity';

@Injectable()
export class TypeOrmSpecialtyRepository implements SpecialtyRepository {
  constructor(@InjectRepository(SpecialtyOrmEntity) private readonly repo: Repository<SpecialtyOrmEntity>) {}

  private map(e: SpecialtyOrmEntity): Specialty {
    return new Specialty(e.id, e.name, e.description, e.active, e.createdAt);
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }

  async findByName(name: string) {
    const e = await this.repo.findOne({ where: { name: name.trim().toLowerCase() } });
    return e ? this.map(e) : undefined;
  }

  async findAll(onlyActive = true, options?: { skip?: number; take?: number }) {
    const where = onlyActive ? { active: true } : {};
    const [entities, total] = await this.repo.findAndCount({ where, order: { name: 'ASC' }, skip: options?.skip, take: options?.take });
    return [entities.map(e => this.map(e)), total] as [Specialty[], number];
  }

  async save(s: Specialty) {
    const e = await this.repo.save(Object.assign(new SpecialtyOrmEntity(), { id: s.id, name: s.name, description: s.description, active: s.active }));
    return this.map(e);
  }

  async update(s: Specialty) {
    await this.repo.update(s.id, { name: s.name, description: s.description, active: s.active });
  }
}
