import { MigrationInterface, QueryRunner } from 'typeorm';

// The front desk books appointments for every doctor but never reads a medical record.
export class SecretaryRole1710000000015 implements MigrationInterface {
  async up(q: QueryRunner) {
    // Postgres 12+ allows adding an enum value inside a transaction as long as the
    // value is not used in that same transaction; this migration only declares it.
    await q.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SECRETARY'`);
  }

  // Irreversible for data: an enum value cannot be dropped, so the type is rebuilt and
  // any front-desk account goes with it. Rolling back removes those users on purpose.
  async down(q: QueryRunner) {
    await q.query(`DELETE FROM users WHERE role = 'SECRETARY'`);
    await q.query(`ALTER TYPE user_role RENAME TO user_role_old`);
    await q.query(`CREATE TYPE user_role AS ENUM ('ADMIN','DOCTOR')`);
    await q.query(`ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role`);
    await q.query(`DROP TYPE user_role_old`);
  }
}
