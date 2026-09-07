import { DomainError } from '../../../shared/domain/errors';

export class AppointmentNotFoundError extends DomainError {
  constructor(id: string) { super('APPOINTMENT_NOT_FOUND', `Turno ${id} no encontrado`, 404); }
}

export class TimeSlotUnavailableError extends DomainError {
  constructor() { super('TIME_SLOT_UNAVAILABLE', 'El horario no está disponible para este médico', 409); }
}

export class DuplicateSpecialtyBookingError extends DomainError {
  constructor() { super('DUPLICATE_SPECIALTY_BOOKING', 'El paciente ya tiene un turno en esta especialidad para el mismo día', 409); }
}

export class CancellationTooLateError extends DomainError {
  constructor() { super('CANCELLATION_TOO_LATE', 'Los turnos solo se pueden cancelar con al menos 24 horas de anticipación', 400); }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(from: string, to: string) { super('INVALID_STATUS_TRANSITION', `No se puede cambiar de ${from} a ${to}`, 400); }
}

export class OutsideAvailabilityError extends DomainError {
  constructor() { super('OUTSIDE_AVAILABILITY', 'El turno está fuera del horario de disponibilidad del médico', 400); }
}
