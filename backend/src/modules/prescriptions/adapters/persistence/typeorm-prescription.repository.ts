import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrescriptionRepository } from '../../prescription.repository.port';
import { Prescription } from '../../domain/prescription';
import { PrescriptionOrmEntity } from './prescription.entity';

@Injectable()
export class TypeOrmPrescriptionRepository implements PrescriptionRepository {
  constructor(
    @InjectRepository(PrescriptionOrmEntity)
    private readonly repo: Repository<PrescriptionOrmEntity>,
  ) {}

  private map(e: PrescriptionOrmEntity): Prescription {
    return new Prescription(
      e.id,
      e.appointmentId,
      e.doctorId,
      e.patientId,
      e.medications,
      e.instructions,
      e.createdAt,
    );
  }

  async save(prescription: Prescription): Promise<Prescription> {
    const e = await this.repo.save(
      Object.assign(new PrescriptionOrmEntity(), {
        appointmentId: prescription.appointmentId,
        doctorId: prescription.doctorId,
        patientId: prescription.patientId,
        medications: prescription.medications,
        instructions: prescription.instructions ?? null,
      }),
    );
    return this.map(e);
  }

  async findById(id: string): Promise<Prescription | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Prescription[]> {
    const entities = await this.repo.find({
      where: { appointmentId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.map(e));
  }

  async findByPatientId(
    patientId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Prescription[]; total: number }> {
    const [entities, total] = await this.repo.findAndCount({
      where: { patientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: entities.map(e => this.map(e)), total };
  }
}
