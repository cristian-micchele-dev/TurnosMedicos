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
    return new Patient(e.id, e.userId, e.phone, e.dateOfBirth, e.address, e.insuranceNumber, e.active, e.createdAt);
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }

  async findByUserId(userId: string) {
    const e = await this.repo.findOne({ where: { userId } });
    return e ? this.map(e) : undefined;
  }

  async findAll() {
    const entities = await this.repo.find({ where: { active: true }, order: { createdAt: 'DESC' } });
    return entities.map(e => this.map(e));
  }

  async save(p: Patient) {
    const e = await this.repo.save(Object.assign(new PatientOrmEntity(), {
      id: p.id, userId: p.userId, phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, active: p.active,
    }));
    return this.map(e);
  }

  async update(p: Patient) {
    await this.repo.update(p.id, { phone: p.phone, dateOfBirth: p.dateOfBirth, address: p.address, insuranceNumber: p.insuranceNumber, active: p.active });
  }
}
