import { Appointment } from './domain/appointment';
import { AppointmentStatus } from './domain/appointment-status.enum';

export interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  specialtyId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | undefined>;
  findAll(filters: AppointmentFilters): Promise<[Appointment[], number]>;
  findByDoctorAndDateTime(doctorId: string, dateTime: Date): Promise<Appointment[]>;
  findByPatientSpecialtyAndDateRange(patientId: string, specialtyId: string, from: Date, to: Date): Promise<Appointment[]>;
  findLastCode(): Promise<string | null>;
  /** PENDING/CONFIRMED appointments with dateTime in [from, to). */
  findActiveBetween(from: Date, to: Date): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<void>;
}

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
