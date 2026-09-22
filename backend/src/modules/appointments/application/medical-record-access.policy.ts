import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../shared/domain/errors';
import { Actor } from '../../users/domain/actor';
import { Role } from '../../users/domain/user';
import { AppointmentRepository, APPOINTMENT_REPOSITORY } from '../appointment.repository.port';
import { DoctorRepository, DOCTOR_REPOSITORY } from '../../doctors/doctor.repository.port';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { AuditService } from '../../audit/application/audit.service';
import { AuditAction } from '../../audit/domain/audit-entry';

/**
 * Who may read a patient's medical records (reports, prescriptions):
 * - ADMIN: any patient.
 * - DOCTOR: only patients they have a treating relationship with (>= 1 appointment).
 * - SECRETARY: never. The front desk schedules care, it does not read it.
 */
@Injectable()
export class MedicalRecordAccessPolicy {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    private readonly audit: AuditService,
  ) {}

  private grant(actor: Actor, patientId: string) {
    return this.audit.record(actor, AuditAction.RECORD_ACCESS_GRANTED, 'patient', patientId);
  }

  private async deny(actor: Actor, patientId: string): Promise<never> {
    await this.audit.record(actor, AuditAction.RECORD_ACCESS_DENIED, 'patient', patientId);
    throw new ForbiddenError();
  }

  async assertCanRead(actor: Actor, patientId: string): Promise<void> {
    if (actor.role === Role.ADMIN) { await this.grant(actor, patientId); return; }
    if (actor.role === Role.SECRETARY) await this.deny(actor, patientId);

    const doctor = await this.doctors.findByUserId(actor.sub);
    if (!doctor) throw new DoctorNotFoundError(actor.sub);
    const [, total] = await this.appointments.findAll({ doctorId: doctor.id, patientId, take: 1 });
    if (total === 0) await this.deny(actor, patientId);
    await this.grant(actor, patientId);
  }
}
