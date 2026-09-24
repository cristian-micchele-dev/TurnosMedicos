import { MigrationInterface, QueryRunner } from 'typeorm';
import { fold } from '../../shared/infra/persistence/text-search';

/**
 * Columna de búsqueda desnormalizada en `appointments`.
 *
 * Buscar un turno es buscar por su código, por el nombre del paciente o por el
 * del médico: un OR entre tres tablas. Postgres tiene que unirlas antes de poder
 * filtrar, así que ningún índice entra — medido contra 200.000 turnos, la
 * búsqueda quedaba en ~1,7 s por más índices que se agregaran.
 *
 * `search_text` junta los tres textos ya plegados (minúsculas, sin acentos) en
 * una sola columna de una sola tabla. Ahí sí un índice GIN de trigramas puede
 * trabajar, y el WHERE deja de tener OR.
 *
 * El precio de desnormalizar es que el dato se queda viejo, así que NO se
 * mantiene desde la aplicación: lo hacen tres triggers, que también cubren a
 * quien escriba por SQL. Los tres llaman a la misma función, para que exista una
 * sola definición de "cómo se arma el texto de búsqueda".
 */
export class AppointmentSearchText1710000000022 implements MigrationInterface {
  name = 'AppointmentSearchText1710000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN "search_text" text NOT NULL DEFAULT ''`);

    // STABLE y no IMMUTABLE: lee otras tablas, así que su resultado depende del
    // estado de la base. Mentirle a Postgres acá haría que cachee lo que no debe.
    await queryRunner.query(`
      CREATE FUNCTION appointment_search_text(p_code varchar, p_patient uuid, p_doctor uuid)
      RETURNS text AS $$
        SELECT ${fold('p_code')}
          || ' ' || coalesce((SELECT ${fold('p.name')} FROM patients p WHERE p.id = p_patient), '')
          || ' ' || coalesce((SELECT ${fold('u.name')} FROM users u
                              JOIN doctors d ON d.user_id = u.id WHERE d.id = p_doctor), '');
      $$ LANGUAGE sql STABLE`);

    await queryRunner.query(`
      CREATE FUNCTION appointments_fill_search() RETURNS trigger AS $$
      BEGIN
        NEW.search_text := appointment_search_text(NEW.code, NEW.patient_id, NEW.doctor_id);
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);

    await queryRunner.query(`
      CREATE TRIGGER appointments_search_biu
      BEFORE INSERT OR UPDATE OF code, patient_id, doctor_id ON appointments
      FOR EACH ROW EXECUTE FUNCTION appointments_fill_search()`);

    // Renombrar a alguien cambia por quién se encuentran sus turnos. Sin esto, la
    // copia queda vieja y el turno sigue apareciendo bajo el apellido anterior.
    await queryRunner.query(`
      CREATE FUNCTION patients_refresh_appointment_search() RETURNS trigger AS $$
      BEGIN
        UPDATE appointments SET search_text = appointment_search_text(code, patient_id, doctor_id)
        WHERE patient_id = NEW.id;
        RETURN NULL;
      END $$ LANGUAGE plpgsql`);

    await queryRunner.query(`
      CREATE TRIGGER patients_search_au
      AFTER UPDATE OF name ON patients
      FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION patients_refresh_appointment_search()`);

    await queryRunner.query(`
      CREATE FUNCTION users_refresh_appointment_search() RETURNS trigger AS $$
      BEGIN
        UPDATE appointments SET search_text = appointment_search_text(code, patient_id, doctor_id)
        WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = NEW.id);
        RETURN NULL;
      END $$ LANGUAGE plpgsql`);

    await queryRunner.query(`
      CREATE TRIGGER users_search_au
      AFTER UPDATE OF name ON users
      FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION users_refresh_appointment_search()`);

    await queryRunner.query(`
      UPDATE appointments SET search_text = appointment_search_text(code, patient_id, doctor_id)`);

    // Sin expresión: la columna ya viene plegada y el patrón de búsqueda también.
    // Un índice liso no puede dejar de coincidir con el WHERE.
    await queryRunner.query(
      `CREATE INDEX "appointments_search_trgm_idx" ON "appointments" USING gin (search_text gin_trgm_ops)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "appointments_search_trgm_idx"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS users_search_au ON users`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS patients_search_au ON patients`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS appointments_search_biu ON appointments`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS users_refresh_appointment_search()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS patients_refresh_appointment_search()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS appointments_fill_search()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS appointment_search_text(varchar, uuid, uuid)`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "search_text"`);
  }
}
