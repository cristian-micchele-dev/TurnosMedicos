import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Message, RecipientNotAvailableError, SelfMessageError } from '../domain/message';
import { MessageRepository, MESSAGE_REPOSITORY } from '../message.repository.port';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { UserRepository } from '../../users/user.repository.port';
import { User } from '../../users/domain/user';
import { Actor } from '../../users/domain/actor';
import { Clock, CLOCK } from '../../../shared/application/ports';

export interface Contact {
  id: string;
  name: string;
  role: string;
}

const asContact = (u: User): Contact => ({ id: u.id, name: u.name || u.email, role: u.role });

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() private readonly gateway?: NotificationsGateway,
  ) {}

  async send(actor: Actor, recipientId: string, body: string) {
    if (actor.sub === recipientId) throw new SelfMessageError();
    const recipient = await this.users.findById(recipientId);
    // Writing into the void is worse than an error: the sender thinks it arrived.
    if (!recipient || !recipient.active) throw new RecipientNotAvailableError();

    const message = new Message(randomUUID(), actor.sub, recipientId, body, null, this.clock.now());
    await this.messages.save(message);

    // Stored first, pushed after: the row is the message, the socket is only speed.
    try {
      this.gateway?.notifyUser(recipientId, 'message', message.toPublic());
    } catch (error) {
      this.logger.warn(`Mensaje ${message.id} guardado pero no emitido`, error as Error);
    }
    return message.toPublic();
  }

  /** Opening a conversation is reading it: what they sent me stops being unread. */
  async thread(actor: Actor, counterpartId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const [list, total] = await this.messages.findThread(actor.sub, counterpartId, {
      skip: (page - 1) * limit,
      take: limit,
    });
    await this.messages.markThreadRead(actor.sub, counterpartId, this.clock.now());

    const counterpart = await this.users.findById(counterpartId);
    return {
      counterpart: counterpart ? asContact(counterpart) : { id: counterpartId, name: 'Usuario dado de baja', role: '' },
      data: list.map((m) => m.toPublic()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async conversations(actor: Actor) {
    const summaries = await this.messages.listConversations(actor.sub);
    // One query for every counterpart, never one per conversation.
    const people = new Map(
      (await this.users.findByIds(summaries.map((s) => s.counterpartId))).map((u) => [u.id, asContact(u)]),
    );
    return summaries.map((s) => ({
      counterpart: people.get(s.counterpartId) ?? { id: s.counterpartId, name: 'Usuario dado de baja', role: '' },
      lastMessage: s.lastMessage.toPublic(),
      unread: s.unread,
    }));
  }

  /** Everyone on staff except the person asking, and except the accounts that are off. */
  contactsFrom(all: User[], selfId: string): Contact[] {
    return all.filter((u) => u.id !== selfId && u.active).map(asContact);
  }

  async contacts(actor: Actor): Promise<Contact[]> {
    const [all] = await this.users.findAll();
    return this.contactsFrom(all, actor.sub);
  }

  countUnread(actor: Actor): Promise<number> {
    return this.messages.countUnread(actor.sub);
  }
}
