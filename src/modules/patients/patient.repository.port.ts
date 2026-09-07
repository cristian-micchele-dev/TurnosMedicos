import { Patient } from './domain/patient';

export interface PatientRepository {
  findById(id: string): Promise<Patient | undefined>;
  findByUserId(userId: string): Promise<Patient | undefined>;
  findAll(): Promise<Patient[]>;
  save(patient: Patient): Promise<Patient>;
  update(patient: Patient): Promise<void>;
}

export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');
