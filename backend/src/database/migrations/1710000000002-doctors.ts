import { MigrationInterface, QueryRunner } from 'typeorm';

export class Doctors1710000000002 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE doctors (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        specialty_id uuid NOT NULL REFERENCES specialties(id),
        license_number varchar(50) NOT NULL UNIQUE,
        phone varchar(30),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX doctors_specialty_idx ON doctors(specialty_id);

      CREATE TABLE availabilities (
        id uuid PRIMARY KEY,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time time NOT NULL,
        end_time time NOT NULL,
        slot_duration_minutes smallint NOT NULL DEFAULT 30 CHECK (slot_duration_minutes BETWEEN 10 AND 120),
        UNIQUE(doctor_id, day_of_week, start_time),
        CHECK (start_time < end_time)
      );
      CREATE INDEX availabilities_doctor_idx ON availabilities(doctor_id);
    `);
  }

  async down(q: QueryRunner) {
    await q.query('DROP TABLE availabilities; DROP TABLE doctors;');
  }
}
