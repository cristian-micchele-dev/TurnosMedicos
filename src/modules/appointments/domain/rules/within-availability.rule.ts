import { AvailabilityRepository } from '../../../doctors/doctor.repository.port';
import { OutsideAvailabilityError } from '../exceptions';

export class WithinAvailabilityRule {
  async validate(doctorId: string, dateTime: Date, repo: AvailabilityRepository): Promise<void> {
    const dayOfWeek = dateTime.getUTCDay();
    const time = dateTime.toISOString().slice(11, 16); // HH:mm
    const blocks = await repo.findByDoctorAndDay(doctorId, dayOfWeek);
    const withinBlock = blocks.some(b => time >= b.startTime && time < b.endTime);
    if (!withinBlock) throw new OutsideAvailabilityError();
  }
}
