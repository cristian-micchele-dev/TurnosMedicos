import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { MedicalReportRepository, MEDICAL_REPORT_REPOSITORY } from '../medical-report.repository.port';
import { AppointmentRepository, APPOINTMENT_REPOSITORY } from '../../appointments/appointment.repository.port';
import { MedicalReport } from '../domain/medical-report';
import { MedicalReportNotFoundError } from '../domain/medical-report-not-found.exception';
import { AppointmentNotFoundError } from '../../appointments/domain/exceptions';
import { PatientNotFoundError } from '../../patients/domain/patient-not-found.exception';
import { ForbiddenError } from '../../../shared/domain/errors';
import { AppointmentStatus } from '../../appointments/domain/appointment-status.enum';
import { CreateMedicalReportDto } from './dto/create-medical-report.dto';
import { CreatePatientReportDto } from './dto/create-patient-report.dto';
import { PaginatedResult } from '../../../shared/application/pagination';
import { PatientRepository, PATIENT_REPOSITORY } from '../../patients/patient.repository.port';
import { DoctorRepository, DOCTOR_REPOSITORY } from '../../doctors/doctor.repository.port';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { MedicalRecordAccessPolicy } from '../../appointments/application/medical-record-access.policy';
import { Actor } from '../../users/domain/actor';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'reports');

@Injectable()
export class MedicalReportService {
  constructor(
    @Inject(MEDICAL_REPORT_REPOSITORY) private readonly reports: MedicalReportRepository,
    @Inject(APPOINTMENT_REPOSITORY) private readonly appointments: AppointmentRepository,
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
    private readonly access: MedicalRecordAccessPolicy,
  ) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // The JWT carries the user id; ownership is checked against the doctor profile id.
  private async resolveDoctorId(userId: string): Promise<string> {
    const doctor = await this.doctors.findByUserId(userId);
    if (!doctor) throw new DoctorNotFoundError(userId);
    return doctor.id;
  }

  async upload(
    doctorUserId: string,
    appointmentId: string,
    dto: CreateMedicalReportDto,
    file: Express.Multer.File,
  ): Promise<ReturnType<MedicalReport['toPublic']>> {
    const doctorId = await this.resolveDoctorId(doctorUserId);
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError(appointmentId);
    if (appointment.doctorId !== doctorId) throw new ForbiddenError();
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new ForbiddenError();
    }

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOADS_DIR, fileName);
    await writeFile(filePath, file.buffer);

    const report = new MedicalReport(
      randomUUID(),
      appointmentId,
      doctorId,
      appointment.patientId,
      dto.title,
      dto.description ?? null,
      fileName,
      file.originalname,
      file.mimetype,
      file.size,
    );

    const saved = await this.reports.save(report);
    return saved.toPublic();
  }

  async uploadForPatient(
    doctorUserId: string,
    patientId: string,
    dto: CreatePatientReportDto,
    file: Express.Multer.File,
  ): Promise<ReturnType<MedicalReport['toPublic']>> {
    const doctorId = await this.resolveDoctorId(doctorUserId);
    const patient = await this.patients.findById(patientId);
    if (!patient) throw new PatientNotFoundError(patientId);

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOADS_DIR, fileName);
    await writeFile(filePath, file.buffer);

    const report = new MedicalReport(
      randomUUID(),
      null,
      doctorId,
      patientId,
      dto.title,
      dto.description ?? null,
      fileName,
      file.originalname,
      file.mimetype,
      file.size,
    );

    const saved = await this.reports.save(report);
    return saved.toPublic();
  }

  async findByAppointment(appointmentId: string, actor: Actor): Promise<ReturnType<MedicalReport['toPublic']>[]> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError(appointmentId);
    await this.access.assertCanRead(actor, appointment.patientId);
    const list = await this.reports.findByAppointmentId(appointmentId);
    return list.map(r => r.toPublic());
  }

  async findByPatient(
    patientId: string,
    page: number,
    limit: number,
    actor: Actor,
  ): Promise<PaginatedResult<ReturnType<MedicalReport['toPublic']>>> {
    await this.access.assertCanRead(actor, patientId);
    const { data, total } = await this.reports.findByPatientId(patientId, page, limit);
    return {
      data: data.map(r => r.toPublic()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findReadable(id: string, actor: Actor): Promise<MedicalReport> {
    const report = await this.reports.findById(id);
    if (!report) throw new MedicalReportNotFoundError(id);
    await this.access.assertCanRead(actor, report.patientId);
    return report;
  }

  async findOne(id: string, actor: Actor): Promise<ReturnType<MedicalReport['toPublic']>> {
    return (await this.findReadable(id, actor)).toPublic();
  }

  async getFilePath(id: string, actor: Actor): Promise<string> {
    const report = await this.findReadable(id, actor);
    return join(UPLOADS_DIR, report.fileName);
  }

  async delete(id: string, doctorUserId: string): Promise<void> {
    const doctorId = await this.resolveDoctorId(doctorUserId);
    const report = await this.reports.findById(id);
    if (!report) throw new MedicalReportNotFoundError(id);
    if (report.doctorId !== doctorId) throw new ForbiddenError();

    const filePath = join(UPLOADS_DIR, report.fileName);
    try { unlinkSync(filePath); } catch { /* file already gone — that is acceptable */ }

    await this.reports.delete(id);
  }
}
