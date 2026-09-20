import { DomainError } from '../../../shared/domain/errors';

export class PrescriptionNotFoundError extends DomainError {
  constructor(id: string) { super('PRESCRIPTION_NOT_FOUND', `Receta ${id} no encontrada`, 404); }
}
