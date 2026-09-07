import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Clock, CLOCK } from '../../../shared/application/ports';
import { Appointment } from '../domain/appointment';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { AppointmentNotFoundError, InvalidStatusTransitionError } from '../domain/exceptions';
import { NoDoubleBookingRule } from '../domain/rules/no-double-booking.rule';
import { WithinAvailabilityRule } from '../domain/rules/within-availability.rule';
import { NoSameDaySpecialtyRule } from '../domain/rules/no-same-day-specialty.rule';
import { CancellationWindowRule } from '../domain/rules/cancellation-window.rule';
import { AppointmentRepository, APPOINTMENT_REPOSITORY } from '../appointment.repository.port';
import { DoctorRepository, AvailabilityRepository, DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY } from '../../doctors/doctor.repository.port';
import { PatientRepository, PATIENT_REPOSITORY } from '../../patients/patient.repository.port';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { PatientNotFoundError } from '../../patients/domain/patient-not-found.exception';
import { CreateAppointmentDto, CancelAppointmentDto, QueryAppointmentsDto } from './dto/appointment.dto';
import { Role } from '../../users/domain/user';

@Injectable()
export class AppointmentService {
  private readonly noDoubleBooking = new NoDoubleBookingRule();
  private readonly withinAvailability = new WithinAvailabilityRule();
  private readonly noSameDaySpecialty = new NoSameDaySpecialtyRule();
  private readonly cancellationWindow = new CancellationWindowRule();

  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availabilities: AvailabilityRepository,
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const doctor = await this.doctors.findById(dto.doctorId);
    if (!doctor) throw new DoctorNotFoundError(dto.doctorId);
    const patient = await this.patients.findById(dto.patientId);
    if (!patient) throw new PatientNotFoundError(dto.patientId);
    const dateTime = new Date(dto.dateTime);

    await this.withinAvailability.validate(doctor.id, dateTime, this.availabilities);
    await this.noDoubleBooking.validate(doctor.id, dateTime, this.appointments);
    await this.noSameDaySpecialty.validate(patient.id, doctor.specialtyId, dateTime, this.appointments);

    const appointment = new Appointment(
      randomUUID(), doctor.id, patient.id, doctor.specialtyId,
      dateTime, dto.durationMinutes ?? 30, AppointmentStatus.PENDING, dto.notes ?? null,
    );
    return (await this.appointments.save(appointment)).toPublic();
  }

  async findAll(query: QueryAppointmentsDto, userId: string, role: Role) {
    const filters = { ...query, from: query.from ? new Date(query.from) : undefined, to: query.to ? new Date(query.to) : undefined };
    if (role === Role.PATIENT) {
      const patient = await this.patients.findByUserId(userId);
      if (!patient) throw new PatientNotFoundError(userId);
      filters.patientId = patient.id;
    } else if (role === Role.DOCTOR) {
      const doctor = await this.doctors.findByUserId(userId);
      if (!doctor) throw new DoctorNotFoundError(userId);
      filters.doctorId = doctor.id;
    }
    const list = await this.appointments.findAll(filters);
    return list.map(a => a.toPublic());
  }

  async findOne(id: string) {
    const a = await this.appointments.findById(id);
    if (!a) throw new AppointmentNotFoundError(id);
    return a.toPublic();
  }

  async confirm(id: string) {
    const a = await this.appointments.findById(id);
    if (!a) throw new AppointmentNotFoundError(id);
    if (a.status !== AppointmentStatus.PENDING) throw new InvalidStatusTransitionError(a.status, AppointmentStatus.CONFIRMED);
    a.status = AppointmentStatus.CONFIRMED;
    await this.appointments.update(a);
    return a.toPublic();
  }

  async cancel(id: string, dto: CancelAppointmentDto) {
    const a = await this.appointments.findById(id);
    if (!a) throw new AppointmentNotFoundError(id);
    if (a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.COMPLETED) {
      throw new InvalidStatusTransitionError(a.status, AppointmentStatus.CANCELLED);
    }
    this.cancellationWindow.validate(a.dateTime, this.clock.now());
    a.status = AppointmentStatus.CANCELLED;
    a.cancellationReason = dto.reason ?? null;
    await this.appointments.update(a);
    return a.toPublic();
  }

  async complete(id: string) {
    const a = await this.appointments.findById(id);
    if (!a) throw new AppointmentNotFoundError(id);
    if (a.status !== AppointmentStatus.CONFIRMED) throw new InvalidStatusTransitionError(a.status, AppointmentStatus.COMPLETED);
    a.status = AppointmentStatus.COMPLETED;
    await this.appointments.update(a);
    return a.toPublic();
  }
}
