import { MigrationInterface, QueryRunner } from 'typeorm';

// Direct messages between staff. No conversations table: a conversation is the
// pair of people, so nothing exists until somebody actually writes.
export class Messages1710000000019 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE messages (
        id uuid PRIMARY KEY,
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body varchar(1000) NOT NULL,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT messages_not_self CHECK (sender_id <> recipient_id)
      )
    `);
    // Reading one conversation: both directions between the same two people.
    await q.query(`CREATE INDEX messages_pair_idx ON messages(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC)`);
    // The unread badge must not scan the whole history.
    await q.query(`CREATE INDEX messages_unread_idx ON messages(recipient_id) WHERE read_at IS NULL`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE messages`);
  }
}
