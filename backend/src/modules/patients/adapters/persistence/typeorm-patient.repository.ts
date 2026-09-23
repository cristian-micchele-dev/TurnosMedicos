import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { PatientRepository } from '../../patient.repository.port';
import { Patient } from '../../domain/patient';
import { PatientOrmEntity } from './patient.entity';
import { fold, likePattern, searchWords } from '../../../../shared/infra/persistence/text-search';

@Injectable()
export class TypeOrmPatientRepository implements PatientRepository {
  constructor(@InjectRepository(PatientOrmEntity) private readonly repo: Repository<PatientOrmEntity>) {}

  private map(e: PatientOrmEntity): Patient {
    return new Patient(e.id, e.name, e.email, e.phone, e.dateOfBirth, e.address, e.insuranceNumber, e.notes, e.active, e.createdAt);
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const entities = await this.repo.find({ where: { id: In(ids) } });
    return entities.map(e => this.map(e));
  }

  async findAll(options?: { skip?: number; take?: number; q?: string }) {
    const qb = this.repo.createQueryBuilder('p').where('p.active = true');
    // "pinilla natalia" and "natalia pinilla" must both find her: every word has to appear
    // in some field, in any order. One bracket per word, ANDed together.
    const words = searchWords(options?.q ?? '');
    words.forEach((word, i) => {
      const key = `w${i}`;
      const like = likePattern(word);
      qb.andWhere(new Brackets((w) => {
        w.where(`${fold('p.name')} LIKE :${key} ESCAPE '\\'`, { [key]: like })
          .orWhere(`${fold("coalesce(p.email, '')")} LIKE :${key} ESCAPE '\\'`)
          .orWhere(`${fold("coalesce(p.insurance_number, '')")} LIKE :${key} ESCAPE '\\'`)
          .orWhere(`${fold("coalesce(p.phone, '')")} LIKE :${key} ESCAPE '\\'`);
      }));
    });
    const [entities, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(options?.skip)
      .take(options?.take)
      .getManyAndCount();
    return [entities.map(e => this.map(e)), total] as [Patient[], number];
  }

  async save(p: Patient) {
    const e = await this.repo.save(Object.assign(new PatientOrmEntity(), {
      id: p.id, name: p.name, email: p.email, phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, notes: p.notes, active: p.active,
    }));
    return this.map(e);
  }

  async update(p: Patient) {
    await this.repo.update(p.id, { name: p.name, email: p.email, phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, notes: p.notes, active: p.active });
  }
}
