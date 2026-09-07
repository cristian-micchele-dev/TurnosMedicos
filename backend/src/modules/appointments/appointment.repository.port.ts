import { Appointment } from './domain/appointment';
import { AppointmentStatus } from './domain/appointment-status.enum';

export interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  specialtyId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
}

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | undefined>;
  findAll(filters: AppointmentFilters): Promise<Appointment[]>;
  findByDoctorAndDateTime(doctorId: string, dateTime: Date): Promise<Appointment[]>;
  findByPatientSpecialtyAndDateRange(patientId: string, specialtyId: string, from: Date, to: Date): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<void>;
}

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
