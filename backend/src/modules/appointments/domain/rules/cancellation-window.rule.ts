import { CancellationTooLateError } from '../exceptions';

export class CancellationWindowRule {
  validate(appointmentDateTime: Date, now: Date): void {
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 24) throw new CancellationTooLateError();
  }
}
