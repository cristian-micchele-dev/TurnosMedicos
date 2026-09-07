import { AppointmentRepository } from '../../appointment.repository.port';
import { AppointmentStatus } from '../appointment-status.enum';
import { TimeSlotUnavailableError } from '../exceptions';

export class NoDoubleBookingRule {
  async validate(doctorId: string, dateTime: Date, repo: AppointmentRepository, excludeId?: string): Promise<void> {
    const existing = await repo.findByDoctorAndDateTime(doctorId, dateTime);
    const conflict = existing.find(a => a.status !== AppointmentStatus.CANCELLED && a.id !== excludeId);
    if (conflict) throw new TimeSlotUnavailableError();
  }
}
