import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConflictError } from '../../../shared/domain/errors';
import { Patient } from '../domain/patient';
import { PatientNotFoundError } from '../domain/patient-not-found.exception';
import { PatientRepository, PATIENT_REPOSITORY } from '../patient.repository.port';
import { UserRepository } from '../../users/user.repository.port';
import { Role } from '../../users/domain/user';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
  ) {}

  async create(dto: CreatePatientDto) {
    const user = await this.users.findById(dto.userId);
    if (!user || user.role !== Role.PATIENT) throw new ConflictError('El usuario no existe o no tiene rol PACIENTE');
    if (await this.patients.findByUserId(dto.userId)) throw new ConflictError('El usuario ya tiene un perfil de paciente');
    const patient = new Patient(randomUUID(), dto.userId, dto.phone ?? null, dto.dateOfBirth ?? null, dto.address ?? null, dto.insuranceNumber ?? null, dto.notes ?? null);
    return (await this.patients.save(patient)).toPublic();
  }

  async findAll() {
    const list = await this.patients.findAll();
    return list.map(p => p.toPublic());
  }

  async findOne(id: string) {
    const p = await this.patients.findById(id);
    if (!p) throw new PatientNotFoundError(id);
    return p.toPublic();
  }

  async findByUserId(userId: string) {
    const p = await this.patients.findByUserId(userId);
    if (!p) throw new PatientNotFoundError(userId);
    return p.toPublic();
  }

  async update(id: string, dto: UpdatePatientDto) {
    const p = await this.patients.findById(id);
    if (!p) throw new PatientNotFoundError(id);
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
