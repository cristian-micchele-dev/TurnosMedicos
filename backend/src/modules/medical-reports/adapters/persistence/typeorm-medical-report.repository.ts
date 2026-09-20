import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalReportRepository } from '../../medical-report.repository.port';
import { MedicalReport } from '../../domain/medical-report';
import { MedicalReportOrmEntity } from './medical-report.entity';

@Injectable()
export class TypeOrmMedicalReportRepository implements MedicalReportRepository {
  constructor(
    @InjectRepository(MedicalReportOrmEntity)
    private readonly repo: Repository<MedicalReportOrmEntity>,
  ) {}

  private map(e: MedicalReportOrmEntity): MedicalReport {
    return new MedicalReport(
      e.id,
      e.appointmentId,
      e.doctorId,
      e.patientId,
      e.title,
      e.description,
      e.fileName,
      e.originalName,
      e.mimeType,
      e.sizeBytes,
      e.createdAt,
    );
  }

  async save(report: MedicalReport): Promise<MedicalReport> {
    const e = await this.repo.save(
      Object.assign(new MedicalReportOrmEntity(), {
        appointmentId: report.appointmentId,
        doctorId: report.doctorId,
        patientId: report.patientId,
        title: report.title,
        description: report.description ?? null,
        fileName: report.fileName,
        originalName: report.originalName,
        mimeType: report.mimeType,
        sizeBytes: report.sizeBytes,
      }),
    );
    return this.map(e);
  }

  async findById(id: string): Promise<MedicalReport | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.map(e) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<MedicalReport[]> {
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
  ): Promise<{ data: MedicalReport[]; total: number }> {
    const [entities, total] = await this.repo.findAndCount({
      where: { patientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: entities.map(e => this.map(e)), total };
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
