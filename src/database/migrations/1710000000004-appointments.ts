import { MigrationInterface, QueryRunner } from 'typeorm';

export class Appointments1710000000004 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TYPE appointment_status AS ENUM ('PENDING','CONFIRMED','CANCELLED','COMPLETED');

      CREATE TABLE appointments (
        id uuid PRIMARY KEY,
        doctor_id uuid NOT NULL REFERENCES doctors(id),
        patient_id uuid NOT NULL REFERENCES patients(id),
        specialty_id uuid NOT NULL REFERENCES specialties(id),
        date_time timestamptz NOT NULL,
        duration_minutes smallint NOT NULL DEFAULT 30,
        status appointment_status NOT NULL DEFAULT 'PENDING',
        notes text,
        cancellation_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(doctor_id, date_time)
      );

      CREATE INDEX appointments_patient_idx ON appointments(patient_id);
      CREATE INDEX appointments_date_idx ON appointments(date_time);
      CREATE INDEX appointments_status_idx ON appointments(status);
      CREATE INDEX appointments_specialty_date_idx ON appointments(specialty_id, date_time);
    `);
  }

  async down(q: QueryRunner) {
    await q.query('DROP TABLE appointments; DROP TYPE appointment_status;');
  }
}
