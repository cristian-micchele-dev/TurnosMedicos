import { MigrationInterface, QueryRunner } from 'typeorm';

export class Specialties1710000000001 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE specialties (
        id uuid PRIMARY KEY,
        name varchar(120) NOT NULL UNIQUE,
        description text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  async down(q: QueryRunner) {
    await q.query('DROP TABLE specialties;');
  }
}
