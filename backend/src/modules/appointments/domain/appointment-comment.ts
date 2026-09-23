import { DomainError } from '../../../shared/domain/errors';

export const MAX_COMMENT_LENGTH = 500;

export class EmptyCommentError extends DomainError {
  constructor() { super('EMPTY_COMMENT', 'El comentario no puede estar vacío', 400); }
}

/**
 * Internal coordination about one appointment: "¿lo confirmo?", "llega tarde",
 * "¿te puedo agregar uno a las 11?".
 *
 * Deliberately NOT a clinical note. It lives attached to the appointment so it
 * inherits who may see that appointment, and it is append-only: a thread nobody
 * can rewrite is its own audit trail, which is why there is no edit and no delete.
 */
export class AppointmentComment {
  constructor(
    public readonly id: string,
    public readonly appointmentId: string,
    public readonly authorId: string,
    public readonly body: string,
    public readonly createdAt: Date = new Date(),
  ) {
    const trimmed = body?.trim() ?? '';
    if (!trimmed) throw new EmptyCommentError();
    this.body = trimmed.slice(0, MAX_COMMENT_LENGTH);
  }

  toPublic(author?: { id: string; name: string; role: string }) {
    return {
      id: this.id,
      appointmentId: this.appointmentId,
      body: this.body,
      createdAt: this.createdAt.toISOString(),
      author: author ?? { id: this.authorId, name: 'Usuario dado de baja', role: '' },
    };
  }
}
