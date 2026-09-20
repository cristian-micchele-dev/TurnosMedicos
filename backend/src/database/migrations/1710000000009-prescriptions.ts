import { MigrationInterface, QueryRunner } from 'typeorm';

export class Prescriptions1710000000009 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE prescriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id uuid REFERENCES appointments(id),
        doctor_id uuid NOT NULL,
        patient_id uuid NOT NULL,
        medications jsonb NOT NULL DEFAULT '[]',
        instructions text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX prescriptions_appointment_idx ON prescriptions(appointment_id);
      CREATE INDEX prescriptions_patient_idx ON prescriptions(patient_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS prescriptions_patient_idx;
      DROP INDEX IF EXISTS prescriptions_appointment_idx;
      DROP TABLE IF EXISTS prescriptions;
    `);
  }
}
