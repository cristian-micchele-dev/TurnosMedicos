import { DomainError } from '../../../shared/domain/errors';

export class NotificationNotFoundError extends DomainError {
  constructor(id: string) { super('NOTIFICATION_NOT_FOUND', `Notificación ${id} no encontrada`, 404); }
}
