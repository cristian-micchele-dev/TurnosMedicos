import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('messages')
// The two queries that matter: "my conversation with X" and "what is unread for me".
@Index(['senderId', 'recipientId', 'createdAt'])
@Index(['recipientId', 'readAt'])
export class MessageOrmEntity {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid', { name: 'sender_id' }) senderId!: string;
  @Column('uuid', { name: 'recipient_id' }) recipientId!: string;
  @Column('varchar', { length: 1000 }) body!: string;
  @Column('timestamptz', { name: 'read_at', nullable: true }) readAt!: Date | null;
  @Column('timestamptz', { name: 'created_at' }) createdAt!: Date;
}
