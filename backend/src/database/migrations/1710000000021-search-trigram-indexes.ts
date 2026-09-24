import { MigrationInterface, QueryRunner } from 'typeorm';
import { trigramIndex } from '../../shared/infra/persistence/text-search';

/**
 * Índices de trigramas para la búsqueda de pacientes.
 *
 * La búsqueda hace `LIKE '%texto%'` sobre columnas plegadas (minúsculas, sin
 * acentos). Con el comodín adelante un btree no sirve: hay que leer la tabla
 * entera. GIN + pg_trgm sí.
 *
 * Están las CUATRO columnas que consulta `TypeOrmPatientRepository.findAll`, y
 * eso no es exceso: el WHERE es un OR, y basta que una rama no tenga índice para
 * que Postgres descarte el plan por índices y escanee todo igual. Medido contra
 * 50.000 pacientes, con sólo `name` indexada la búsqueda seguía en 590-706 ms;
 * con las cuatro aparece el BitmapOr y baja a 0,09-47 ms.
 *
 * La expresión sale de `trigramIndex`, el mismo `fold` que arma el WHERE —
 * incluido el `coalesce` de las columnas nulables. Un índice por expresión sólo
 * entra si coincide carácter por carácter, y cuando no coincide no falla: deja
 * de usarse en silencio.
 *
 * La búsqueda de TURNOS no se arregla con índices: su OR cruza tres tablas
 * (código del turno, nombre del paciente, nombre del médico) y Postgres tiene que
 * unir antes de filtrar. Se probó indexando todas las ramas y no cambió nada.
 * Eso necesita una columna de búsqueda desnormalizada, que es otra discusión.
 */
export class SearchTrigramIndexes1710000000021 implements MigrationInterface {
  name = 'SearchTrigramIndexes1710000000021';

  private static readonly COLUMNS: [string, string][] = [
    ['patients_name_trgm_idx', 'name'],
    ['patients_email_trgm_idx', "coalesce(email, '')"],
    ['patients_insurance_trgm_idx', "coalesce(insurance_number, '')"],
    ['patients_phone_trgm_idx', "coalesce(phone, '')"],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    for (const [name, column] of SearchTrigramIndexes1710000000021.COLUMNS) {
      await queryRunner.query(trigramIndex(name, 'patients', column));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of SearchTrigramIndexes1710000000021.COLUMNS) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
    // La extensión no se borra: puede haberla instalado otro, y sin índices que
    // la usen no le molesta a nadie.
  }
}
