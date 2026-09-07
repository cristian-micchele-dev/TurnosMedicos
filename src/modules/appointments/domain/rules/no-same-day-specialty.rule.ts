import { AppointmentRepository } from '../../appointment.repository.port';
import { AppointmentStatus } from '../appointment-status.enum';
import { DuplicateSpecialtyBookingError } from '../exceptions';

export class NoSameDaySpecialtyRule {
  async validate(patientId: string, specialtyId: string, dateTime: Date, repo: AppointmentRepository, excludeId?: string): Promise<void> {
    const startOfDay = new Date(dateTime);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateTime);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const existing = await repo.findByPatientSpecialtyAndDateRange(patientId, specialtyId, startOfDay, endOfDay);
    const conflict = existing.find(a => a.status !== AppointmentStatus.CANCELLED && a.id !== excludeId);
    if (conflict) throw new DuplicateSpecialtyBookingError();
  }
}
