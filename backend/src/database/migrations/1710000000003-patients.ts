import { MigrationInterface, QueryRunner } from 'typeorm';

export class Patients1710000000003 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        phone varchar(30),
        date_of_birth date,
        address varchar(255),
        insurance_number varchar(50),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  async down(q: QueryRunner) {
    await q.query('DROP TABLE patients;');
  }
}
