import { Specialty } from './domain/specialty';

export interface SpecialtyRepository {
  findById(id: string): Promise<Specialty | undefined>;
  findByName(name: string): Promise<Specialty | undefined>;
  findAll(onlyActive?: boolean): Promise<Specialty[]>;
  save(specialty: Specialty): Promise<Specialty>;
  update(specialty: Specialty): Promise<void>;
}

export const SPECIALTY_REPOSITORY = Symbol('SPECIALTY_REPOSITORY');
