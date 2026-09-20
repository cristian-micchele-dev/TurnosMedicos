import { Prescription } from './domain/prescription';

export const PRESCRIPTION_REPOSITORY = Symbol('PRESCRIPTION_REPOSITORY');

export interface PrescriptionRepository {
  save(prescription: Prescription): Promise<Prescription>;
  findById(id: string): Promise<Prescription | null>;
  findByAppointmentId(appointmentId: string): Promise<Prescription[]>;
  findByPatientId(patientId: string, page: number, limit: number): Promise<{ data: Prescription[]; total: number }>;
}
