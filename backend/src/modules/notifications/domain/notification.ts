export enum NotificationType {
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
}

/**
 * A notification that waits.
 *
 * Emitting over a socket reaches whoever happens to be connected; a doctor who
 * was seeing a patient when the front desk booked for them was never going to
 * be. So the notification is a row first and a socket message second.
 */
export class Notification {
  constructor(
    public readonly id: string,
    /** The account that must see it. */
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly message: string,
    public readonly appointmentId: string | null = null,
    public readAt: Date | null = null,
    public readonly createdAt: Date = new Date(),
  ) {}

  get read(): boolean {
    return this.readAt !== null;
  }

  markRead(now: Date): void {
    this.readAt ??= now;
  }

  toPublic() {
    return {
      id: this.id,
      type: this.type,
      message: this.message,
      appointmentId: this.appointmentId,
      read: this.read,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
