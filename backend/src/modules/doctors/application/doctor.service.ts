import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConflictError } from '../../../shared/domain/errors';
import { Doctor } from '../domain/doctor';
import { Availability } from '../domain/availability';
import { DoctorNotFoundError } from '../domain/doctor-not-found.exception';
import { DoctorRepository, AvailabilityRepository, DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY } from '../doctor.repository.port';
import { SpecialtyRepository, SPECIALTY_REPOSITORY } from '../../specialties/specialty.repository.port';
import { SpecialtyNotFoundError } from '../../specialties/domain/specialty-not-found.exception';
import { UserRepository } from '../../users/user.repository.port';
import { Role } from '../../users/domain/user';
import { CreateDoctorDto, UpdateDoctorDto, SetAvailabilityDto } from './dto/doctor.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

@Injectable()
export class DoctorService {
  constructor(
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availabilities: AvailabilityRepository,
    @Inject(SPECIALTY_REPOSITORY) private readonly specialties: SpecialtyRepository,
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
  ) {}

  async create(dto: CreateDoctorDto) {
    const user = await this.users.findById(dto.userId);
    if (!user || user.role !== Role.DOCTOR) throw new ConflictError('El usuario no existe o no tiene rol DOCTOR');
    if (await this.doctors.findByUserId(dto.userId)) throw new ConflictError('El usuario ya tiene un perfil de médico');
    if (await this.doctors.findByLicense(dto.licenseNumber)) throw new ConflictError('La matrícula ya está registrada');
    if (!(await this.specialties.findById(dto.specialtyId))) throw new SpecialtyNotFoundError(dto.specialtyId);
    const doctor = new Doctor(randomUUID(), dto.userId, dto.specialtyId, dto.licenseNumber, dto.phone ?? null);
    return (await this.doctors.save(doctor)).toPublic();
  }

  async findAll(filters?: { specialtyId?: string }, pagination: PaginationDto = {}): Promise<PaginatedResult<ReturnType<Doctor['toPublic']>>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [list, total] = await this.doctors.findAll({ ...filters, active: true, skip, take: limit });
    return { data: list.map(d => d.toPublic()), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const d = await this.doctors.findById(id);
    if (!d) throw new DoctorNotFoundError(id);
    return d.toPublic();
  }

  async findByUserId(userId: string) {
    const d = await this.doctors.findByUserId(userId);
    if (!d) throw new DoctorNotFoundError(userId);
    return d.toPublic();
  }

  async update(id: string, dto: UpdateDoctorDto) {
    const d = await this.doctors.findById(id);
    if (!d) throw new DoctorNotFoundError(id);
    if (dto.specialtyId !== undefined) {
      if (!(await this.specialties.findById(dto.specialtyId))) throw new SpecialtyNotFoundError(dto.specialtyId);
      d.specialtyId = dto.specialtyId;
    }
    if (dto.licenseNumber !== undefined) {
      const existing = await this.doctors.findByLicense(dto.licenseNumber);
      if (existing && existing.id !== id) throw new ConflictError('La matrícula ya está registrada');
      d.licenseNumber = dto.licenseNumber;
    }
    if (dto.phone !== undefined) d.phone = dto.phone ?? null;
    if (dto.active !== undefined) d.active = dto.active;
    await this.doctors.update(d);
    return d.toPublic();
  }

  async setAvailability(doctorId: string, dto: SetAvailabilityDto) {
    const d = await this.doctors.findById(doctorId);
    if (!d) throw new DoctorNotFoundError(doctorId);
    await this.availabilities.deleteByDoctor(doctorId);
    const saved = await Promise.all(
      dto.slots.map(slot =>
        this.availabilities.save(new Availability(randomUUID(), doctorId, slot.dayOfWeek, slot.startTime, slot.endTime, slot.slotDurationMinutes ?? 30)),
      ),
    );
    return saved.map(a => a.toPublic());
  }

  async getAvailability(doctorId: string, date?: string) {
    const d = await this.doctors.findById(doctorId);
    if (!d) throw new DoctorNotFoundError(doctorId);
    if (date) {
      const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
      const blocks = await this.availabilities.findByDoctorAndDay(doctorId, dayOfWeek);
      return blocks.map(a => ({ ...a.toPublic(), slots: a.generateSlots() }));
    }
    const all = await this.availabilities.findByDoctor(doctorId);
    return all.map(a => a.toPublic());
  }
}
