import { MigrationInterface, QueryRunner } from 'typeorm';

// Doctors may carry a profile photo; only the file name is stored, the bytes live under uploads/avatars.
export class DoctorAvatar1710000000014 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE doctors ADD COLUMN avatar_file varchar(80)`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE doctors DROP COLUMN avatar_file`);
  }
}
