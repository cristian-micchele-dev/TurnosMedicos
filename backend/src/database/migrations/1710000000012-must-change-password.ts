import { MigrationInterface, QueryRunner } from 'typeorm';

// Closed system without email: an ADMIN resets a user's password to a temporary one
// and the user is forced to choose their own on next login.
export class MustChangePassword1710000000012 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE users ADD COLUMN must_change_password boolean NOT NULL DEFAULT false`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE users DROP COLUMN must_change_password`);
  }
}
