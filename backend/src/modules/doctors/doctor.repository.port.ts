import { Doctor } from './domain/doctor';
import { Availability } from './domain/availability';
import { ScheduleBlock } from './domain/schedule-block';

export interface DoctorRepository {
  findById(id: string): Promise<Doctor | undefined>;
  findByIds(ids: string[]): Promise<Doctor[]>;
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

export interface ScheduleBlockRepository {
  findByDoctor(doctorId: string): Promise<ScheduleBlock[]>;
  findOverlapping(doctorId: string, dateTime: Date): Promise<ScheduleBlock[]>;
  save(block: ScheduleBlock): Promise<ScheduleBlock>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<ScheduleBlock | undefined>;
}

export const DOCTOR_REPOSITORY = Symbol('DOCTOR_REPOSITORY');
export const AVAILABILITY_REPOSITORY = Symbol('AVAILABILITY_REPOSITORY');
export const SCHEDULE_BLOCK_REPOSITORY = Symbol('SCHEDULE_BLOCK_REPOSITORY');
