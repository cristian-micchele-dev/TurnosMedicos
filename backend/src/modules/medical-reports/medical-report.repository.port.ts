import { MedicalReport } from './domain/medical-report';

export const MEDICAL_REPORT_REPOSITORY = Symbol('MEDICAL_REPORT_REPOSITORY');

export interface MedicalReportRepository {
  save(report: MedicalReport): Promise<MedicalReport>;
  findById(id: string): Promise<MedicalReport | null>;
  findByAppointmentId(appointmentId: string): Promise<MedicalReport[]>;
  findByPatientId(patientId: string, page: number, limit: number): Promise<{ data: MedicalReport[]; total: number }>;
  delete(id: string): Promise<void>;
}
