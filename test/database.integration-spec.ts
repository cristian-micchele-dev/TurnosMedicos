import { DataSource } from 'typeorm';
import { UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity } from '../src/modules/users/adapters/persistence/entities';
import { Foundation1710000000000 } from '../src/database/migrations/1710000000000-foundation';

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('PostgreSQL foundation integration', () => {
  let dataSource: DataSource;
  beforeAll(async () => {
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl, entities: [UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity], migrations: [Foundation1710000000000] });
    await dataSource.initialize();
    await dataSource.runMigrations();
  });
  afterAll(async () => { if (dataSource?.isInitialized) await dataSource.destroy(); });
  it('crea las tablas y restricciones de la migración', async () => {
    const tables = await dataSource.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    expect(tables.map((table: { table_name: string }) => table.table_name)).toEqual(expect.arrayContaining(['users', 'auth_sessions', 'password_reset_tokens']));
  });
});
