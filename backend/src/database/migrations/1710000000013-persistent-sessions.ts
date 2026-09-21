import { MigrationInterface, QueryRunner } from 'typeorm';

// "Remember me": a session flagged persistent keeps its long lifetime across refresh rotations.
export class PersistentSessions1710000000013 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE auth_sessions ADD COLUMN persistent boolean NOT NULL DEFAULT false`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE auth_sessions DROP COLUMN persistent`);
  }
}
