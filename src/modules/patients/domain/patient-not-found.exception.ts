import { DomainError } from '../../../shared/domain/errors';

export class PatientNotFoundError extends DomainError {
  constructor(id: string) { super('PATIENT_NOT_FOUND', `Paciente ${id} no encontrado`, 404); }
}
