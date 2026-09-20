import { AppointmentStatus } from './appointment-status.enum';
import { InvalidStatusTransitionError } from './exceptions';

export class Appointment {
  constructor(
    public readonly id: string,
    public readonly doctorId: string,
    public readonly patientId: string,
    public readonly specialtyId: string,
    public dateTime: Date,
    public durationMinutes: number = 30,
    public status: AppointmentStatus = AppointmentStatus.PENDING,
    public notes: string | null = null,
    public cancellationReason: string | null = null,
    public readonly createdAt: Date = new Date(),
    public code: string = '',
    public diagnosis: string | null = null,
  ) {}

  confirm() {
    if (this.status !== AppointmentStatus.PENDING) throw new InvalidStatusTransitionError(this.status, AppointmentStatus.CONFIRMED);
    this.status = AppointmentStatus.CONFIRMED;
  }

  cancel(reason?: string) {
    if (this.status !== AppointmentStatus.PENDING && this.status !== AppointmentStatus.CONFIRMED) throw new InvalidStatusTransitionError(this.status, AppointmentStatus.CANCELLED);
    this.status = AppointmentStatus.CANCELLED;
    this.cancellationReason = reason ?? null;
  }

  complete() {
    if (this.status !== AppointmentStatus.CONFIRMED) throw new InvalidStatusTransitionError(this.status, AppointmentStatus.COMPLETED);
    this.status = AppointmentStatus.COMPLETED;
  }

  toPublic() {
    return {
      id: this.id, code: this.code, doctorId: this.doctorId, patientId: this.patientId, specialtyId: this.specialtyId,
      dateTime: this.dateTime.toISOString(), durationMinutes: this.durationMinutes, status: this.status,
      notes: this.notes, diagnosis: this.diagnosis, cancellationReason: this.cancellationReason, createdAt: this.createdAt,
    };
  }
}
