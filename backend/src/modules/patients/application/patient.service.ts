import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Patient } from '../domain/patient';
import { PatientNotFoundError } from '../domain/patient-not-found.exception';
import { PatientRepository, PATIENT_REPOSITORY } from '../patient.repository.port';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

@Injectable()
export class PatientService {
  constructor(@Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository) {}

  async create(dto: CreatePatientDto) {
    const patient = new Patient(
      randomUUID(), dto.name.trim(), dto.email?.trim().toLowerCase() ?? null,
      dto.phone ?? null, dto.dateOfBirth ?? null, dto.address ?? null, dto.insuranceNumber ?? null, dto.notes ?? null,
    );
    return (await this.patients.save(patient)).toPublic();
  }

  async findAll(pagination: PaginationDto = {}): Promise<PaginatedResult<ReturnType<Patient['toPublic']>>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [list, total] = await this.patients.findAll({ skip, take: limit });
    return { data: list.map(p => p.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const p = await this.patients.findById(id);
    if (!p) throw new PatientNotFoundError(id);
    return p.toPublic();
  }

  async update(id: string, dto: UpdatePatientDto) {
    const p = await this.patients.findById(id);
    if (!p) throw new PatientNotFoundError(id);
    if (dto.name !== undefined) p.name = dto.name.trim();
    if (dto.email !== undefined) p.email = dto.email?.trim().toLowerCase() ?? null;
    if (dto.phone !== undefined) p.phone = dto.phone ?? null;
    if (dto.dateOfBirth !== undefined) p.dateOfBirth = dto.dateOfBirth ?? null;
    if (dto.address !== undefined) p.address = dto.address ?? null;
    if (dto.insuranceNumber !== undefined) p.insuranceNumber = dto.insuranceNumber ?? null;
    if (dto.notes !== undefined) p.notes = dto.notes ?? null;
    if (dto.active !== undefined) p.active = dto.active;
    await this.patients.update(p);
    return p.toPublic();
  }
}
