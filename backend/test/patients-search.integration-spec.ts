import { DataSource } from 'typeorm';
import { PatientOrmEntity } from '../src/modules/patients/adapters/persistence/patient.entity';
import { TypeOrmPatientRepository } from '../src/modules/patients/adapters/persistence/typeorm-patient.repository';
import { Patient } from '../src/modules/patients/domain/patient';

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

// Runs against the real schema (all migrations), so the SQL of the search is what ships.
describeDatabase('Patient search (PostgreSQL)', () => {
  let dataSource: DataSource;
  let repo: TypeOrmPatientRepository;
  const ids: string[] = [];
  const tag = `srch-${Date.now()}`;

  const add = async (name: string, email: string | null, insurance: string | null, phone: string | null, active = true) => {
    const p = new Patient(crypto.randomUUID(), name, email, phone, null, null, insurance, null, active);
    ids.push(p.id);
    await repo.save(p);
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres', url: databaseUrl, entities: [PatientOrmEntity],
      migrations: ['src/database/migrations/*.ts'],
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    repo = new TypeOrmPatientRepository(dataSource.getRepository(PatientOrmEntity));
    await add(`Sofía Pérez ${tag}`, `sofia.${tag}@mail.com`, 'OSDE 4411', '11-5555-0001');
    await add(`Bruno Díaz ${tag}`, null, `SWISS-${tag}`, '11-5555-0002');
    await add(`Ñoño Muñoz ${tag}`, `nono.${tag}@mail.com`, null, null);
    await add(`Inactiva Pérez ${tag}`, null, null, null, false);
  });

  afterAll(async () => {
    if (ids.length) await dataSource.query('DELETE FROM patients WHERE id = ANY($1)', [ids]);
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  const names = async (q: string) => (await repo.findAll({ q, take: 50 }))[0].map((p) => p.name);

  it('encuentra por nombre sin importar acentos ni mayúsculas', async () => {
    expect(await names(`perez ${tag}`)).toEqual([`Sofía Pérez ${tag}`]);
    expect(await names(`SOFIA`)).toEqual(expect.arrayContaining([`Sofía Pérez ${tag}`]));
  });

  it('trata ñ como n en ambos sentidos', async () => {
    expect(await names(`nono munoz ${tag}`)).toEqual([`Ñoño Muñoz ${tag}`]);
    expect(await names(`ÑOÑO muñoz ${tag}`)).toEqual([`Ñoño Muñoz ${tag}`]);
  });

  it('busca también por email, obra social y teléfono', async () => {
    expect(await names(`sofia.${tag}@`)).toEqual([`Sofía Pérez ${tag}`]);
    expect(await names(`swiss-${tag}`)).toEqual([`Bruno Díaz ${tag}`]);
    expect(await names('5555-0002')).toEqual([`Bruno Díaz ${tag}`]);
  });

  it('varias palabras: todas deben aparecer, en cualquier orden y campo', async () => {
    expect(await names(`perez sofia ${tag}`)).toEqual([`Sofía Pérez ${tag}`]);
    expect(await names('bruno swiss')).toEqual(expect.arrayContaining([`Bruno Díaz ${tag}`]));
    expect(await names(`sofia diaz ${tag}`)).toEqual([]);
  });

  it('nunca devuelve pacientes inactivos y cuenta el total real', async () => {
    const [list, total] = await repo.findAll({ q: tag, take: 2 });
    expect(list).toHaveLength(2);
    expect(total).toBe(3);
    expect(list.map((p) => p.name)).not.toContain(`Inactiva Pérez ${tag}`);
  });

  it('un patrón con comodines SQL se busca literal, no como comodín', async () => {
    expect(await names(`%${tag}`)).toEqual([]);
    expect(await names(`_${tag}`)).toEqual([]);
  });
});
