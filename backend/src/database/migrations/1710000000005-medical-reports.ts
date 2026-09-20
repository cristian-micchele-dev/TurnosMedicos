import { MigrationInterface, QueryRunner } from 'typeorm';

export class MedicalReports1710000000005 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE medical_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id uuid NOT NULL REFERENCES appointments(id),
        doctor_id uuid NOT NULL,
        patient_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        file_name varchar(255) NOT NULL,
        original_name varchar(255) NOT NULL,
        mime_type varchar(100) NOT NULL,
        size_bytes integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX medical_reports_appointment_idx ON medical_reports(appointment_id);
      CREATE INDEX medical_reports_doctor_idx ON medical_reports(doctor_id);
      CREATE INDEX medical_reports_patient_idx ON medical_reports(patient_id);
    `);
  }

  async down(q: QueryRunner) {
    await q.query('DROP TABLE medical_reports;');
  }
}
