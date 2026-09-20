import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptionalAppointmentReport1710000000008 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE medical_reports ALTER COLUMN appointment_id DROP NOT NULL;
    `);
  }

  async down(q: QueryRunner) {
    await q.query(`
      ALTER TABLE medical_reports ALTER COLUMN appointment_id SET NOT NULL;
    `);
  }
}
