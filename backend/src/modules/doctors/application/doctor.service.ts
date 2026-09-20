import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConflictError, ForbiddenError } from '../../../shared/domain/errors';
import { Actor } from '../../users/domain/actor';
import { Doctor } from '../domain/doctor';
import { Availability } from '../domain/availability';
import { ScheduleBlock } from '../domain/schedule-block';
import { DoctorNotFoundError } from '../domain/doctor-not-found.exception';
import { DoctorRepository, AvailabilityRepository, ScheduleBlockRepository, DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY, SCHEDULE_BLOCK_REPOSITORY } from '../doctor.repository.port';
import { SpecialtyRepository, SPECIALTY_REPOSITORY } from '../../specialties/specialty.repository.port';
import { SpecialtyNotFoundError } from '../../specialties/domain/specialty-not-found.exception';
import { UserRepository } from '../../users/user.repository.port';
import { Role } from '../../users/domain/user';
import { CreateDoctorDto, UpdateDoctorDto, SetAvailabilityDto, CreateScheduleBlockDto } from './dto/doctor.dto';
import { PaginationDto, PaginatedResult } from '../../../shared/application/pagination';

@Injectable()
export class DoctorService {
  constructor(
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    @Inject(AVAILABILITY_REPOSITORY) private readonly availabilities: AvailabilityRepository,
    @Inject(SCHEDULE_BLOCK_REPOSITORY) private readonly scheduleBlocks: ScheduleBlockRepository,
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

  // A DOCTOR may only touch its own profile; ADMIN may touch any.
  private async assertOwnsProfile(doctorId: string, actor: Actor) {
    if (actor.role !== Role.DOCTOR) return;
    const own = await this.doctors.findByUserId(actor.sub);
    if (!own) throw new DoctorNotFoundError(actor.sub);
    if (own.id !== doctorId) throw new ForbiddenError();
  }

  async update(id: string, dto: UpdateDoctorDto, actor: Actor) {
    await this.assertOwnsProfile(id, actor);
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

  async setAvailability(doctorId: string, dto: SetAvailabilityDto, actor: Actor) {
    await this.assertOwnsProfile(doctorId, actor);
    const d = await this.doctors.findById(doctorId);
    if (!d) throw new DoctorNotFoundError(doctorId);
    await this.availabilities.deleteByDoctor(doctorId);
    const saved = await Promise.all(
      dto.slots.map(slot =>
        this.availabilities.save(new Availability(randomUUID(), doctorId, slot.dayOfWeek, slot.startTime, slot.endTime, slot.slotDuration ?? 30)),
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

  async addBlock(doctorId: string, dto: CreateScheduleBlockDto, actor: Actor) {
    await this.assertOwnsProfile(doctorId, actor);
    const d = await this.doctors.findById(doctorId);
    if (!d) throw new DoctorNotFoundError(doctorId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Las fechas no son válidas');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
    const block = new ScheduleBlock(randomUUID(), doctorId, startDate, endDate, dto.reason ?? null, new Date());
    const saved = await this.scheduleBlocks.save(block);
    return saved.toPublic();
  }

  async removeBlock(doctorId: string, blockId: string, actor: Actor) {
    await this.assertOwnsProfile(doctorId, actor);
    const block = await this.scheduleBlocks.findById(blockId);
    if (!block) throw new NotFoundException(`Bloqueo ${blockId} no encontrado`);
    if (block.doctorId !== doctorId) throw new NotFoundException(`Bloqueo ${blockId} no encontrado`);
    await this.scheduleBlocks.delete(blockId);
  }

  async getBlocks(doctorId: string) {
    const d = await this.doctors.findById(doctorId);
    if (!d) throw new DoctorNotFoundError(doctorId);
    const blocks = await this.scheduleBlocks.findByDoctor(doctorId);
    return blocks.map(b => b.toPublic());
  }

  async isBlocked(doctorId: string, dateTime: Date): Promise<boolean> {
    const overlapping = await this.scheduleBlocks.findOverlapping(doctorId, dateTime);
    return overlapping.length > 0;
  }
}
