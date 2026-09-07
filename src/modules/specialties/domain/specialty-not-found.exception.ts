import { DomainError } from '../../../shared/domain/errors';

export class SpecialtyNotFoundError extends DomainError {
  constructor(id: string) { super('SPECIALTY_NOT_FOUND', `Especialidad ${id} no encontrada`, 404); }
}
