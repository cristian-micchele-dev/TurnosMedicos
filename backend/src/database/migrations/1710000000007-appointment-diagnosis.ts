import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentDiagnosis1710000000007 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE appointments ADD COLUMN diagnosis text;`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE appointments DROP COLUMN diagnosis;`);
  }
}
