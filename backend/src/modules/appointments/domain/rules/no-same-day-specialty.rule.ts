import { AppointmentRepository } from '../../appointment.repository.port';
import { AppointmentStatus } from '../appointment-status.enum';
import { DuplicateSpecialtyBookingError } from '../exceptions';
import { clinicDayRange, toClinicDate } from '../../../../shared/infra/time/format';

// "Same day" means the clinic's calendar day, not the UTC one: a 22:00 booking in Buenos Aires
// is already the next day in UTC but must still count against today's specialty visit.
export class NoSameDaySpecialtyRule {
  async validate(patientId: string, specialtyId: string, dateTime: Date, repo: AppointmentRepository, excludeId?: string): Promise<void> {
    const { start, end } = clinicDayRange(toClinicDate(dateTime));
    const existing = await repo.findByPatientSpecialtyAndDateRange(patientId, specialtyId, start, end);
    const conflict = existing.find(a => a.status !== AppointmentStatus.CANCELLED && a.id !== excludeId);
    if (conflict) throw new DuplicateSpecialtyBookingError();
  }
}
