import { MigrationInterface, QueryRunner } from 'typeorm';

// Internal coordination about one appointment ("¿lo confirmo?", "llega tarde").
// Append-only: no updated_at and no soft delete, because a thread nobody can
// rewrite is its own audit trail.
export class AppointmentComments1710000000018 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE appointment_comments (
        id uuid PRIMARY KEY,
        appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        -- RESTRICT y no CASCADE: un comentario sin autor es un comentario sin responsable.
        author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        body varchar(500) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX appointment_comments_thread_idx ON appointment_comments(appointment_id, created_at)`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE appointment_comments`);
  }
}
