import { Message } from './domain/message';

/** One row per person you have talked to, newest activity first. */
export interface ConversationSummary {
  counterpartId: string;
  lastMessage: Message;
  unread: number;
}

export interface MessageRepository {
  save(message: Message): Promise<void>;
  /** Everything exchanged between the two, oldest first. */
  findThread(userId: string, counterpartId: string, options?: { skip?: number; take?: number }): Promise<[Message[], number]>;
  listConversations(userId: string): Promise<ConversationSummary[]>;
  /** Marks as read what the counterpart sent me; never what I sent. */
  markThreadRead(userId: string, counterpartId: string, at: Date): Promise<void>;
  countUnread(userId: string): Promise<number>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
