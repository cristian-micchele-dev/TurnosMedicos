import { AvailabilityRepository } from '../../../doctors/doctor.repository.port';
import { OutsideAvailabilityError } from '../exceptions';
import { toClinicClock } from '../../../../shared/infra/time/format';

export class WithinAvailabilityRule {
  async validate(doctorId: string, dateTime: Date, repo: AvailabilityRepository): Promise<void> {
    const { dayOfWeek, time } = toClinicClock(dateTime);
    const blocks = await repo.findByDoctorAndDay(doctorId, dayOfWeek);
    const withinBlock = blocks.some(b => time >= b.startTime && time < b.endTime);
    if (!withinBlock) throw new OutsideAvailabilityError();
  }
}
