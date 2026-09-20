import { DomainError } from '../../../shared/domain/errors';

export class MedicalReportNotFoundError extends DomainError {
  constructor(id: string) { super('MEDICAL_REPORT_NOT_FOUND', `Informe médico ${id} no encontrado`, 404); }
}
