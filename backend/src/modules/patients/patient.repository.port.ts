import { Patient } from './domain/patient';

export interface PatientRepository {
  findById(id: string): Promise<Patient | undefined>;
  findByIds(ids: string[]): Promise<Patient[]>;
  /** `q` matches name, email, insurance number and phone, ignoring case and accents. */
  findAll(options?: { skip?: number; take?: number; q?: string }): Promise<[Patient[], number]>;
  save(patient: Patient): Promise<Patient>;
  update(patient: Patient): Promise<void>;
}

export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');
