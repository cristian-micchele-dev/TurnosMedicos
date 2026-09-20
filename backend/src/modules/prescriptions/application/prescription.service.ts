import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrescriptionRepository, PRESCRIPTION_REPOSITORY } from '../prescription.repository.port';
import { AppointmentRepository, APPOINTMENT_REPOSITORY } from '../../appointments/appointment.repository.port';
import { Prescription } from '../domain/prescription';
import { PrescriptionNotFoundError } from '../domain/prescription-not-found.exception';
import { AppointmentNotFoundError } from '../../appointments/domain/exceptions';
import { ForbiddenError } from '../../../shared/domain/errors';
import { AppointmentStatus } from '../../appointments/domain/appointment-status.enum';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { PaginatedResult } from '../../../shared/application/pagination';
import { DoctorRepository, DOCTOR_REPOSITORY } from '../../doctors/doctor.repository.port';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { MedicalRecordAccessPolicy } from '../../appointments/application/medical-record-access.policy';
import { Actor } from '../../users/domain/actor';

@Injectable()
export class PrescriptionService {
  constructor(
    @Inject(PRESCRIPTION_REPOSITORY) private readonly prescriptions: PrescriptionRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    private readonly access: MedicalRecordAccessPolicy,
  ) {}

  // The JWT carries the user id; ownership is checked against the doctor profile id.
  private async resolveDoctorId(userId: string): Promise<string> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor) throw new DoctorNotFoundError(userId);
    return doctor.id;
  }

  async create(
    doctorUserId: string,
    appointmentId: string,
    dto: CreatePrescriptionDto,
  ): Promise<ReturnType<Prescription['toPublic']>> {
    const doctorId = await this.resolveDoctorId(doctorUserId);
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError(appointmentId);
    if (appointment.doctorId !== doctorId) throw new ForbiddenError();
    if (appointment.status !== AppointmentStatus.COMPLETED) throw new ForbiddenError();

    const prescription = new Prescription(
      randomUUID(),
      appointmentId,
      doctorId,
      appointment.patientId,
      dto.medications,
      dto.instructions ?? null,
    );

    const saved = await this.prescriptions.save(prescription);
    return saved.toPublic();
  }

  async findByAppointment(appointmentId: string, actor: Actor): Promise<ReturnType<Prescription['toPublic']>[]> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError(appointmentId);
    await this.access.assertCanRead(actor, appointment.patientId);
    const list = await this.prescriptions.findByAppointmentId(appointmentId);
    return list.map(p => p.toPublic());
  }

  async findByPatient(
    patientId: string,
    page: number,
    limit: number,
    actor: Actor,
  ): Promise<PaginatedResult<ReturnType<Prescription['toPublic']>>> {
    await this.access.assertCanRead(actor, patientId);
    const { data, total } = await this.prescriptions.findByPatientId(patientId, page, limit);
    return {
      data: data.map(p => p.toPublic()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, actor: Actor): Promise<ReturnType<Prescription['toPublic']>> {
    const prescription = await this.prescriptions.findById(id);
    if (!prescription) throw new PrescriptionNotFoundError(id);
    await this.access.assertCanRead(actor, prescription.patientId);
    return prescription.toPublic();
  }
}
