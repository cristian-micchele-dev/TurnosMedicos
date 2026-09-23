import { AppointmentComment } from './domain/appointment-comment';

export interface AppointmentCommentRepository {
  save(comment: AppointmentComment): Promise<void>;
  /** Oldest first: a thread is read in the order it was written. */
  findByAppointment(appointmentId: string): Promise<AppointmentComment[]>;
}

export const APPOINTMENT_COMMENT_REPOSITORY = Symbol('APPOINTMENT_COMMENT_REPOSITORY');
