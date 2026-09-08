import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientRepository } from '../../patient.repository.port';
import { Patient } from '../../domain/patient';
import { PatientOrmEntity } from './patient.entity';

@Injectable()
export class TypeOrmPatientRepository implements PatientRepository {
  constructor(@InjectRepository(PatientOrmEntity) private readonly repo: Repository<PatientOrmEntity>) {}

  private map(e: PatientOrmEntity): Patient {
    const p = new Patient(e.id, e.userId, e.phone, e.dateOfBirth, e.address, e.insuranceNumber, e.notes, e.active, e.createdAt);
    if (e.user) p.user = { id: e.user.id, email: e.user.email, name: e.user.name };
    return p;
  }

  private readonly relations = ['user'];

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id }, relations: this.relations });
    return e ? this.map(e) : undefined;
  }

  async findByUserId(userId: string) {
    const e = await this.repo.findOne({ where: { userId }, relations: this.relations });
    return e ? this.map(e) : undefined;
  }

  async findAll(options?: { skip?: number; take?: number }) {
    const [entities, total] = await this.repo.findAndCount({ where: { active: true }, order: { createdAt: 'DESC' }, relations: this.relations, skip: options?.skip, take: options?.take });
    return [entities.map(e => this.map(e)), total] as [Patient[], number];
  }

  async save(p: Patient) {
    const e = await this.repo.save(Object.assign(new PatientOrmEntity(), {
      id: p.id, userId: p.userId, phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, notes: p.notes, active: p.active,
    }));
    return this.map(e);
  }

  async update(p: Patient) {
    await this.repo.update(p.id, { phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, notes: p.notes, active: p.active });
  }
}
