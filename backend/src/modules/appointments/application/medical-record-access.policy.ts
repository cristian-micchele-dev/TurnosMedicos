import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../shared/domain/errors';
import { Actor } from '../../users/domain/actor';
import { Role } from '../../users/domain/user';
import { AppointmentRepository, APPOINTMENT_REPOSITORY } from '../appointment.repository.port';
import { DoctorRepository, DOCTOR_REPOSITORY } from '../../doctors/doctor.repository.port';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';

/**
 * Who may read a patient's medical records (reports, prescriptions):
 * - ADMIN: any patient.
 * - DOCTOR: only patients they have a treating relationship with (>= 1 appointment).
 */
@Injectable()
export class MedicalRecordAccessPolicy {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
  ) {}

  async assertCanRead(actor: Actor, patientId: string): Promise<void> {
    if (actor.role === Role.ADMIN) return;

    const doctor = await this.doctors.findByUserId(actor.sub);
    if (!doctor) throw new DoctorNotFoundError(actor.sub);
    const [, total] = await this.appointments.findAll({ doctorId: doctor.id, patientId, take: 1 });
    if (total === 0) throw new ForbiddenError();
  }
}
