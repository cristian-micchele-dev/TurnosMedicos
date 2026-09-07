import { AppointmentStatus } from './appointment-status.enum';

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
  ) {}

  toPublic() {
    return {
      id: this.id, doctorId: this.doctorId, patientId: this.patientId, specialtyId: this.specialtyId,
      dateTime: this.dateTime.toISOString(), durationMinutes: this.durationMinutes, status: this.status,
      notes: this.notes, cancellationReason: this.cancellationReason, createdAt: this.createdAt,
    };
  }
}
