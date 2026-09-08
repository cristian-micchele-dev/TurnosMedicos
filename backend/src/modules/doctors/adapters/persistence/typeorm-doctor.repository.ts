import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorRepository, AvailabilityRepository } from '../../doctor.repository.port';
import { Doctor } from '../../domain/doctor';
import { Availability } from '../../domain/availability';
import { DoctorOrmEntity, AvailabilityOrmEntity } from './doctor.entity';

@Injectable()
export class TypeOrmDoctorRepository implements DoctorRepository {
  constructor(@InjectRepository(DoctorOrmEntity) private readonly repo: Repository<DoctorOrmEntity>) {}

  private map(e: DoctorOrmEntity): Doctor {
    const d = new Doctor(e.id, e.userId, e.specialtyId, e.licenseNumber, e.phone, e.active, e.createdAt);
    if (e.user) d.user = { id: e.user.id, email: e.user.email, name: e.user.name };
    if (e.specialty) d.specialty = { id: e.specialty.id, name: e.specialty.name };
    return d;
  }

  private readonly relations = ['user', 'specialty'];

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id }, relations: this.relations });
    return e ? this.map(e) : undefined;
  }

  async findByUserId(userId: string) {
    const e = await this.repo.findOne({ where: { userId }, relations: this.relations });
    return e ? this.map(e) : undefined;
  }

  async findByLicense(license: string) {
    const e = await this.repo.findOne({ where: { licenseNumber: license } });
    return e ? this.map(e) : undefined;
  }

  async findAll(filters?: { specialtyId?: string; active?: boolean; skip?: number; take?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.specialtyId) where.specialtyId = filters.specialtyId;
    if (filters?.active !== undefined) where.active = filters.active;
    else where.active = true;
    const [entities, total] = await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, relations: this.relations, skip: filters?.skip, take: filters?.take });
    return [entities.map(e => this.map(e)), total] as [Doctor[], number];
  }

  async save(d: Doctor) {
    const e = await this.repo.save(Object.assign(new DoctorOrmEntity(), {
      id: d.id, userId: d.userId, specialtyId: d.specialtyId, licenseNumber: d.licenseNumber, phone: d.phone, active: d.active,
    }));
    return this.map(e);
  }

  async update(d: Doctor) {
    await this.repo.update(d.id, { specialtyId: d.specialtyId, licenseNumber: d.licenseNumber, phone: d.phone, active: d.active });
  }
}

@Injectable()
export class TypeOrmAvailabilityRepository implements AvailabilityRepository {
  constructor(@InjectRepository(AvailabilityOrmEntity) private readonly repo: Repository<AvailabilityOrmEntity>) {}

  private map(e: AvailabilityOrmEntity): Availability {
    return new Availability(e.id, e.doctorId, e.dayOfWeek, e.startTime, e.endTime, e.slotDurationMinutes);
  }

  async findByDoctor(doctorId: string) {
    const entities = await this.repo.find({ where: { doctorId }, order: { dayOfWeek: 'ASC', startTime: 'ASC' } });
    return entities.map(e => this.map(e));
  }

  async findByDoctorAndDay(doctorId: string, dayOfWeek: number) {
    const entities = await this.repo.find({ where: { doctorId, dayOfWeek }, order: { startTime: 'ASC' } });
    return entities.map(e => this.map(e));
  }

  async save(a: Availability) {
    const e = await this.repo.save(Object.assign(new AvailabilityOrmEntity(), {
      id: a.id, doctorId: a.doctorId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, slotDurationMinutes: a.slotDurationMinutes,
    }));
    return this.map(e);
  }

  async deleteByDoctor(doctorId: string) {
    await this.repo.delete({ doctorId });
  }
}
