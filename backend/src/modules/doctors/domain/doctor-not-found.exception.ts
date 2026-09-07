import { DomainError } from '../../../shared/domain/errors';

export class DoctorNotFoundError extends DomainError {
  constructor(id: string) { super('DOCTOR_NOT_FOUND', `Médico ${id} no encontrado`, 404); }
}
