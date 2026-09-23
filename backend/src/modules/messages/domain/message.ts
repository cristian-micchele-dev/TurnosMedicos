import { DomainError } from '../../../shared/domain/errors';

export const MAX_MESSAGE_LENGTH = 1000;

export class EmptyMessageError extends DomainError {
  constructor() { super('EMPTY_MESSAGE', 'El mensaje no puede estar vacío', 400); }
}

export class SelfMessageError extends DomainError {
  constructor() { super('SELF_MESSAGE', 'No podés escribirte a vos mismo', 400); }
}

export class RecipientNotAvailableError extends DomainError {
  constructor() { super('RECIPIENT_NOT_AVAILABLE', 'Esa persona no está disponible para recibir mensajes', 400); }
}

/**
 * A direct message between two members of staff.
 *
 * There is no conversations table: a conversation IS the pair of people, so a
 * message only needs to know who wrote it and who must read it. That keeps the
 * model honest — nothing exists until someone actually writes.
 *
 * Deliberately text only. Allowing an attachment here would route a medical
 * report around the module that guards who may read one.
 */
export class Message {
  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly recipientId: string,
    public readonly body: string,
    public readAt: Date | null = null,
    public readonly createdAt: Date = new Date(),
  ) {
    if (senderId === recipientId) throw new SelfMessageError();
    const trimmed = body?.trim() ?? '';
    if (!trimmed) throw new EmptyMessageError();
    this.body = trimmed.slice(0, MAX_MESSAGE_LENGTH);
  }

  get read(): boolean {
    return this.readAt !== null;
  }

  toPublic() {
    return {
      id: this.id,
      senderId: this.senderId,
      recipientId: this.recipientId,
      body: this.body,
      read: this.read,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
