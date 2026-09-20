import { MigrationInterface, QueryRunner } from 'typeorm';

// Closed system: patients are records, not users. Identity moves from users → patients
// and PATIENT accounts are removed. Irreversible for deleted user rows.
export class PatientsOwnIdentity1710000000011 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE patients ADD COLUMN name varchar(120), ADD COLUMN email varchar(255)`);
    await q.query(`
      UPDATE patients p SET name = COALESCE(NULLIF(u.name, ''), u.email), email = u.email
      FROM users u WHERE u.id = p.user_id
    `);
    await q.query(`UPDATE patients SET name = 'Paciente sin nombre' WHERE name IS NULL`);
    await q.query(`ALTER TABLE patients ALTER COLUMN name SET NOT NULL`);
    await q.query(`ALTER TABLE patients DROP COLUMN user_id`);
    await q.query(`DELETE FROM users WHERE role = 'PATIENT'`);
    await q.query(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);
    await q.query(`ALTER TYPE user_role RENAME TO user_role_old`);
    await q.query(`CREATE TYPE user_role AS ENUM ('ADMIN','DOCTOR')`);
    await q.query(`ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role`);
    await q.query(`DROP TYPE user_role_old`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TYPE user_role RENAME TO user_role_old`);
    await q.query(`CREATE TYPE user_role AS ENUM ('ADMIN','DOCTOR','PATIENT')`);
    await q.query(`ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role`);
    await q.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'PATIENT'`);
    await q.query(`DROP TYPE user_role_old`);
    await q.query(`ALTER TABLE patients ADD COLUMN user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE`);
    await q.query(`ALTER TABLE patients DROP COLUMN name, DROP COLUMN email`);
  }
}
