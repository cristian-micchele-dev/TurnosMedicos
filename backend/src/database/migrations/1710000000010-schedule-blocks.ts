import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleBlocks1710000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE schedule_blocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        start_date timestamptz NOT NULL,
        end_date timestamptz NOT NULL,
        reason varchar(255),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX schedule_blocks_doctor_idx ON schedule_blocks(doctor_id)`);
    await queryRunner.query(`CREATE INDEX schedule_blocks_dates_idx ON schedule_blocks(start_date, end_date)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_blocks`);
  }
}
