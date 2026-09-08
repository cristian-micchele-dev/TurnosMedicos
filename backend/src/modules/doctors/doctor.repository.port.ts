import { Doctor } from './domain/doctor';
import { Availability } from './domain/availability';

export interface DoctorRepository {
  findById(id: string): Promise<Doctor | undefined>;
  findByUserId(userId: string): Promise<Doctor | undefined>;
  findByLicense(license: string): Promise<Doctor | undefined>;
  findAll(filters?: { specialtyId?: string; active?: boolean; skip?: number; take?: number }): Promise<[Doctor[], number]>;
  save(doctor: Doctor): Promise<Doctor>;
  update(doctor: Doctor): Promise<void>;
}

export interface AvailabilityRepository {
  findByDoctor(doctorId: string): Promise<Availability[]>;
  findByDoctorAndDay(doctorId: string, dayOfWeek: number): Promise<Availability[]>;
  save(availability: Availability): Promise<Availability>;
  deleteByDoctor(doctorId: string): Promise<void>;
}

export const DOCTOR_REPOSITORY = Symbol('DOCTOR_REPOSITORY');
export const AVAILABILITY_REPOSITORY = Symbol('AVAILABILITY_REPOSITORY');
