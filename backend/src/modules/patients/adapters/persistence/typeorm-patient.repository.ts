import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PatientRepository } from '../../patient.repository.port';
import { Patient } from '../../domain/patient';
import { PatientOrmEntity } from './patient.entity';

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

  async findAll(options?: { skip?: number; take?: number }) {
    const [entities, total] = await this.repo.findAndCount({ where: { active: true }, order: { createdAt: 'DESC' }, skip: options?.skip, take: options?.take });
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
