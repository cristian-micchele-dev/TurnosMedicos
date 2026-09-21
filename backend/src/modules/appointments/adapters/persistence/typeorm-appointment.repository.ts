import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, LessThan, And, Repository } from 'typeorm';
import { AppointmentStatus } from '../../domain/appointment-status.enum';
import { AppointmentRepository, AppointmentFilters, DaySummaryRow } from '../../appointment.repository.port';
import { APP_TIME_ZONE } from '../../../../shared/infra/time/format';
import { Appointment } from '../../domain/appointment';
import { AppointmentOrmEntity } from './appointment.entity';

@Injectable()
export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(@InjectRepository(AppointmentOrmEntity) private readonly repo: Repository<AppointmentOrmEntity>) {}

  private map(e: AppointmentOrmEntity): Appointment {
    return new Appointment(e.id, e.doctorId, e.patientId, e.specialtyId, e.dateTime, e.durationMinutes, e.status, e.notes, e.cancellationReason, e.createdAt, e.code, e.diagnosis);
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

  // Grouped in the clinic's time zone so a 22:00 appointment lands on the right calendar day.
  async countByDayAndStatus(filters: { doctorId?: string; from: Date; to: Date }): Promise<DaySummaryRow[]> {
    // '::int' would be read by TypeORM as a named parameter, hence CAST.
    const day = `to_char(a.date_time AT TIME ZONE :tz, 'YYYY-MM-DD')`;
    const qb = this.repo.createQueryBuilder('a')
      .select(day, 'date')
      .addSelect('a.status', 'status')
      .addSelect('CAST(COUNT(*) AS int)', 'count')
      .where('a.date_time >= :from AND a.date_time <= :to', { from: filters.from, to: filters.to })
      .setParameter('tz', APP_TIME_ZONE)
      .groupBy(day).addGroupBy('a.status')
      .orderBy(day, 'ASC');
    if (filters.doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId: filters.doctorId });
    return qb.getRawMany<DaySummaryRow>();
  }

  async findByDoctorAndDateTime(doctorId: string, dateTime: Date) {
    const entities = await this.repo.find({ where: { doctorId, dateTime } });
    return entities.map(e => this.map(e));
  }

  async findByPatientSpecialtyAndDateRange(patientId: string, specialtyId: string, from: Date, to: Date) {
    const entities = await this.repo.find({ where: { patientId, specialtyId, dateTime: Between(from, to) } });
    return entities.map(e => this.map(e));
  }

  async findActiveBetween(from: Date, to: Date) {
    const entities = await this.repo.find({
      where: { status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]), dateTime: And(MoreThanOrEqual(from), LessThan(to)) },
      order: { dateTime: 'ASC' },
    });
    return entities.map(e => this.map(e));
  }

  async findLastCode(): Promise<string | null> {
    const e = await this.repo.findOne({ where: {}, order: { code: 'DESC' } });
    return e?.code ?? null;
  }

  async save(a: Appointment) {
    const e = await this.repo.save(Object.assign(new AppointmentOrmEntity(), {
      id: a.id, code: a.code, doctorId: a.doctorId, patientId: a.patientId, specialtyId: a.specialtyId,
      dateTime: a.dateTime, durationMinutes: a.durationMinutes, status: a.status, notes: a.notes, cancellationReason: a.cancellationReason,
    }));
    return this.map(e);
  }

  async update(a: Appointment) {
    await this.repo.update(a.id, { status: a.status, notes: a.notes, diagnosis: a.diagnosis, cancellationReason: a.cancellationReason, dateTime: a.dateTime, durationMinutes: a.durationMinutes });
  }
}
