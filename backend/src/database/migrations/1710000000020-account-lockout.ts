import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Intentos fallidos y bloqueo temporal, en la cuenta.
 *
 * Va en Postgres y no en un contador en memoria porque tiene que sobrevivir a un
 * reinicio y ser el mismo para todas las instancias: un bloqueo que se borra al
 * reiniciar, o que sólo conoce una de tres instancias, no bloquea nada.
 */
export class AccountLockout1710000000020 implements MigrationInterface {
  name = 'AccountLockout1710000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "failed_login_attempts" smallint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "locked_until" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "failed_login_attempts"`);
  }
}
