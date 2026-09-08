import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AppointmentRepository, AppointmentFilters } from '../../appointment.repository.port';
import { Appointment } from '../../domain/appointment';
import { AppointmentOrmEntity } from './appointment.entity';

@Injectable()
export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(@InjectRepository(AppointmentOrmEntity) private readonly repo: Repository<AppointmentOrmEntity>) {}

  private map(e: AppointmentOrmEntity): Appointment {
    return new Appointment(e.id, e.doctorId, e.patientId, e.specialtyId, e.dateTime, e.durationMinutes, e.status, e.notes, e.cancellationReason, e.createdAt);
  }

  async findById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : undefined;
  }

  async findAll(filters: AppointmentFilters): Promise<[Appointment[], number]> {
    const qb = this.repo.createQueryBuilder('a');
    if (filters.doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId: filters.doctorId });
    if (filters.patientId) qb.andWhere('a.patient_id = :patientId', { patientId: filters.patientId });
    if (filters.specialtyId) qb.andWhere('a.specialty_id = :specialtyId', { specialtyId: filters.specialtyId });
    if (filters.status) qb.andWhere('a.status = :status', { status: filters.status });
    if (filters.from) qb.andWhere('a.date_time >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.date_time <= :to', { to: filters.to });
    qb.orderBy('a.date_time', 'ASC');
    if (filters.skip !== undefined) qb.skip(filters.skip);
    if (filters.take !== undefined) qb.take(filters.take);
    const [entities, total] = await qb.getManyAndCount();
    return [entities.map(e => this.map(e)), total];
  }

  async findByDoctorAndDateTime(doctorId: string, dateTime: Date) {
    const entities = await this.repo.find({ where: { doctorId, dateTime } });
    return entities.map(e => this.map(e));
  }

  async findByPatientSpecialtyAndDateRange(patientId: string, specialtyId: string, from: Date, to: Date) {
    const entities = await this.repo.find({ where: { patientId, specialtyId, dateTime: Between(from, to) } });
    return entities.map(e => this.map(e));
  }

  async save(a: Appointment) {
    const e = await this.repo.save(Object.assign(new AppointmentOrmEntity(), {
      id: a.id, doctorId: a.doctorId, patientId: a.patientId, specialtyId: a.specialtyId,
      dateTime: a.dateTime, durationMinutes: a.durationMinutes, status: a.status, notes: a.notes, cancellationReason: a.cancellationReason,
    }));
    return this.map(e);
  }

  async update(a: Appointment) {
    await this.repo.update(a.id, { status: a.status, notes: a.notes, cancellationReason: a.cancellationReason, dateTime: a.dateTime, durationMinutes: a.durationMinutes });
  }
}
