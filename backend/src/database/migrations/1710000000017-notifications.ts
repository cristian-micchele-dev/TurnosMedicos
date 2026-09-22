import { MigrationInterface, QueryRunner } from 'typeorm';

// Until now a notification was a socket message: whoever was not connected never got it.
// Now it is a row that waits, and the socket is only how it arrives early.
export class Notifications1710000000017 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(40) NOT NULL,
        message varchar(240) NOT NULL,
        appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // The inbox is always "mine, newest first".
    await q.query(`CREATE INDEX notifications_user_created_idx ON notifications(user_id, created_at DESC)`);
    // Counting the unread badge must not read the whole history.
    await q.query(`CREATE INDEX notifications_unread_idx ON notifications(user_id) WHERE read_at IS NULL`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE notifications`);
  }
}
