import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { MessageRepository, ConversationSummary } from '../../message.repository.port';
import { Message } from '../../domain/message';
import { MessageOrmEntity } from './message.entity';

@Injectable()
export class TypeOrmMessageRepository implements MessageRepository {
  constructor(@InjectRepository(MessageOrmEntity) private readonly repo: Repository<MessageOrmEntity>) {}

  private map(e: MessageOrmEntity): Message {
    return new Message(e.id, e.senderId, e.recipientId, e.body, e.readAt, e.createdAt);
  }

  async save(m: Message): Promise<void> {
    await this.repo.insert({
      id: m.id, senderId: m.senderId, recipientId: m.recipientId, body: m.body, readAt: m.readAt, createdAt: m.createdAt,
    });
  }

  async findThread(userId: string, counterpartId: string, options: { skip?: number; take?: number } = {}): Promise<[Message[], number]> {
    // A conversation is both directions between the same two people.
    const [rows, total] = await this.repo.createQueryBuilder('m')
      .where(new Brackets((w) => {
        w.where('m.sender_id = :a AND m.recipient_id = :b', { a: userId, b: counterpartId })
          .orWhere('m.sender_id = :b AND m.recipient_id = :a', { a: userId, b: counterpartId });
      }))
      .orderBy('m.created_at', 'ASC')
      .skip(options.skip)
      .take(options.take)
      .getManyAndCount();
    return [rows.map((r) => this.map(r)), total];
  }

  /**
   * One row per counterpart with its latest message and how many of theirs I
   * have not read. DISTINCT ON is Postgres picking the newest row per group in
   * a single pass — the alternative is one query per conversation.
   */
  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await this.repo.query(
      `SELECT DISTINCT ON (counterpart)
              CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS counterpart,
              m.id, m.sender_id, m.recipient_id, m.body, m.read_at, m.created_at,
              (SELECT count(*)::int FROM messages u
                WHERE u.recipient_id = $1
                  AND u.sender_id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
                  AND u.read_at IS NULL) AS unread
         FROM messages m
        WHERE m.sender_id = $1 OR m.recipient_id = $1
        ORDER BY counterpart, m.created_at DESC`,
      [userId],
    );

    return rows
      .map((r: { counterpart: string; id: string; sender_id: string; recipient_id: string; body: string; read_at: Date | null; created_at: Date; unread: number }) => ({
        counterpartId: r.counterpart,
        lastMessage: new Message(r.id, r.sender_id, r.recipient_id, r.body, r.read_at, r.created_at),
        unread: r.unread,
      }))
      // Newest conversation first; DISTINCT ON forces its own ordering.
      .sort((a: ConversationSummary, b: ConversationSummary) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime());
  }

  async markThreadRead(userId: string, counterpartId: string, at: Date): Promise<void> {
    await this.repo.update({ recipientId: userId, senderId: counterpartId, readAt: IsNull() }, { readAt: at });
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { recipientId: userId, readAt: IsNull() } });
  }
}
