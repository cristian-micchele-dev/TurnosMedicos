import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { Role, User } from '../modules/users/domain/user';

export interface SeedAdminInput { email: string; password: string; name: string }
export interface SeedAdminDeps {
  users: { findByEmail(email: string): Promise<User | undefined>; save(user: User): Promise<User> };
  hasher: { hash(value: string): Promise<string> };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Closed system: there is no public registration, so the first ADMIN must be bootstrapped from here.
export async function seedAdmin({ users, hasher }: SeedAdminDeps, input: SeedAdminInput): Promise<'created' | 'exists'> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('ADMIN_EMAIL no es un email válido');
  if (input.password.length < 8) throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');

  if (await users.findByEmail(email)) return 'exists';
  await users.save(new User(randomUUID(), email, input.name.trim(), await hasher.hash(input.password), Role.ADMIN));
  return 'created';
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';
  if (!email || !password) {
    console.error('Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] npm run seed:admin');
    process.exit(1);
  }

  const { default: dataSource } = await import('./data-source');
  const { UserOrmEntity } = await import('../modules/users/adapters/persistence/entities');
  const { Argon2Hasher } = await import('../shared/infra/crypto/services');

  await dataSource.initialize();
  try {
    const repo = dataSource.getRepository(UserOrmEntity);
    const result = await seedAdmin(
      {
        users: {
          findByEmail: async (e) => { const row = await repo.findOne({ where: { email: e } }); return row ? new User(row.id, row.email, row.name, row.passwordHash, row.role, row.active, row.createdAt) : undefined; },
          save: async (u) => { await repo.save(Object.assign(new UserOrmEntity(), { id: u.id, email: u.email, name: u.name, passwordHash: u.passwordHash, role: u.role, active: u.active })); return u; },
        },
        hasher: new Argon2Hasher(),
      },
      { email, password, name },
    );
    console.log(result === 'created' ? `ADMIN creado: ${email.trim().toLowerCase()}` : `ADMIN ya existía: ${email.trim().toLowerCase()} (sin cambios)`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) void main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
