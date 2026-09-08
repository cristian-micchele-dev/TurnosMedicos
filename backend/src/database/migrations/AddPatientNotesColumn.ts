import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientNotesColumn1694000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "notes" text`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "notes"`);
  }
}
