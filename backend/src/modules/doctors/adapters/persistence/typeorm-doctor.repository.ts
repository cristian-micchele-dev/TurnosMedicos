import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { DoctorRepository, AvailabilityRepository, ScheduleBlockRepository } from '../../doctor.repository.port';
import { Doctor } from '../../domain/doctor';
import { Availability } from '../../domain/availability';
import { ScheduleBlock } from '../../domain/schedule-block';
import { DoctorOrmEntity, AvailabilityOrmEntity, ScheduleBlockOrmEntity } from './doctor.entity';

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

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const entities = await this.repo.find({ where: { id: In(ids) }, relations: this.relations });
    return entities.map(e => this.map(e));
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
    const trim = (t: string) => t.substring(0, 5); // "HH:mm:ss" → "HH:mm"
    return new Availability(e.id, e.doctorId, e.dayOfWeek, trim(e.startTime), trim(e.endTime), e.slotDurationMinutes);
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

@Injectable()
export class TypeOrmScheduleBlockRepository implements ScheduleBlockRepository {
  constructor(@InjectRepository(ScheduleBlockOrmEntity) private readonly repo: Repository<ScheduleBlockOrmEntity>) {}

  private map(e: ScheduleBlockOrmEntity): ScheduleBlock {
    return new ScheduleBlock(e.id, e.doctorId, e.startDate, e.endDate, e.reason, e.createdAt);
  }

  async findByDoctor(doctorId: string) {
    const entities = await this.repo.find({ where: { doctorId }, order: { startDate: 'ASC' } });
    return entities.map(e => this.map(e));
  }

  async findOverlapping(doctorId: string, dateTime: Date) {
    const entities = await this.repo.find({
      where: {
        doctorId,
        startDate: LessThanOrEqual(dateTime),
        endDate: MoreThanOrEqual(dateTime),
      },
    });
    return entities.map(e => this.map(e));
  }

  async save(block: ScheduleBlock) {
    const e = await this.repo.save(Object.assign(new ScheduleBlockOrmEntity(), {
      id: block.id,
      doctorId: block.doctorId,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
    }));
    return this.map(e);
  }

  async delete(id: string) {
    await this.repo.delete(id);
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }
}
