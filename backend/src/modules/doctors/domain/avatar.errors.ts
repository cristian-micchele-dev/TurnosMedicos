import { DomainError } from '../../../shared/domain/errors';

export class AvatarNotFoundError extends DomainError {
  constructor(doctorId: string) { super('AVATAR_NOT_FOUND', `El médico ${doctorId} no tiene foto`, 404); }
}

export class UnsupportedImageError extends DomainError {
  constructor() { super('UNSUPPORTED_IMAGE', 'La foto debe ser JPG, PNG o WebP de hasta 2 MB', 400); }
}
