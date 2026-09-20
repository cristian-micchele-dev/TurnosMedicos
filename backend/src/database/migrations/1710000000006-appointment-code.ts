import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentCode1710000000006 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE appointments ADD COLUMN code varchar(20) UNIQUE;`);
    await q.query(`
      UPDATE appointments
      SET code = 'TM-' || LPAD(sub.row_number::text, 5, '0')
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS row_number
        FROM appointments
      ) sub
      WHERE appointments.id = sub.id;
    `);
    await q.query(`ALTER TABLE appointments ALTER COLUMN code SET NOT NULL;`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE appointments DROP COLUMN code;`);
  }
}
