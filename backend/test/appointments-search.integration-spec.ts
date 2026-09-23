import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppointmentOrmEntity } from '../src/modules/appointments/adapters/persistence/appointment.entity';
import { TypeOrmAppointmentRepository } from '../src/modules/appointments/adapters/persistence/typeorm-appointment.repository';

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

/**
 * La búsqueda de turnos cruza tres tablas (turno, paciente, médico), así que lo
 * único que prueba algo es el SQL real contra el esquema real. Un mock del
 * QueryBuilder confirmaría que escribí lo que escribí, no que la base entienda.
 */
describeDatabase('Appointment search (PostgreSQL)', () => {
  let dataSource: DataSource;
  let repo: TypeOrmAppointmentRepository;

  const tag = `aps-${Date.now()}`;
  const specialtyId = randomUUID();
  const userId = randomUUID();
  const doctorId = randomUUID();
  const patientIds: string[] = [];
  const appointmentIds: string[] = [];

  const addPatient = async (name: string) => {
    const id = randomUUID();
    patientIds.push(id);
    await dataSource.query('INSERT INTO patients (id, name) VALUES ($1, $2)', [id, name]);
    return id;
  };

  const addAppointment = async (code: string, patientId: string, dayOffset: number) => {
    const id = randomUUID();
    appointmentIds.push(id);
    const when = new Date(Date.UTC(2026, 8, 20 + dayOffset, 13, 0, 0));
    await dataSource.query(
      `INSERT INTO appointments (id, code, doctor_id, patient_id, specialty_id, date_time, duration_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 30, 'PENDING')`,
      [id, code, doctorId, patientId, specialtyId, when],
    );
    return id;
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres', url: databaseUrl, entities: [AppointmentOrmEntity],
      migrations: ['src/database/migrations/*.ts'],
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    repo = new TypeOrmAppointmentRepository(dataSource.getRepository(AppointmentOrmEntity));

    await dataSource.query('INSERT INTO specialties (id, name) VALUES ($1, $2)', [specialtyId, `Cardiología ${tag}`]);
    await dataSource.query(
      `INSERT INTO users (id, email, name, password_hash, role) VALUES ($1, $2, $3, 'x', 'DOCTOR')`,
      [userId, `doc.${tag}@mail.com`, `Martín Iñíguez ${tag}`],
    );
    await dataSource.query(
      'INSERT INTO doctors (id, user_id, specialty_id, license_number) VALUES ($1, $2, $3, $4)',
      [doctorId, userId, specialtyId, `MP-${tag}`],
    );

    const sofia = await addPatient(`Sofía Pérez ${tag}`);
    const bruno = await addPatient(`Bruno Díaz ${tag}`);
    await addAppointment(`ZT-${tag.slice(-5)}`, sofia, 0);
    await addAppointment(`ZY-${tag.slice(-5)}`, bruno, 1);
  }, 60_000);

  afterAll(async () => {
    if (appointmentIds.length) await dataSource.query('DELETE FROM appointments WHERE id = ANY($1)', [appointmentIds]);
    if (patientIds.length) await dataSource.query('DELETE FROM patients WHERE id = ANY($1)', [patientIds]);
    await dataSource.query('DELETE FROM doctors WHERE id = $1', [doctorId]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.query('DELETE FROM specialties WHERE id = $1', [specialtyId]);
    if (dataSource?.isInitialized) await dataSource.destroy();
  }, 30_000);

  const codes = async (q: string) => (await repo.findAll({ q, take: 50 }))[0].map((a) => a.code);

  it('encuentra por nombre del paciente, sin acentos ni mayúsculas', async () => {
    expect(await codes(`sofia perez ${tag}`)).toEqual([`ZT-${tag.slice(-5)}`]);
    expect(await codes(`DIAZ ${tag}`)).toEqual([`ZY-${tag.slice(-5)}`]);
  });

  it('encuentra por nombre del médico: trae todos sus turnos', async () => {
    expect((await codes(`iniguez ${tag}`)).sort()).toEqual([`ZT-${tag.slice(-5)}`, `ZY-${tag.slice(-5)}`]);
  });

  it('encuentra por código del turno', async () => {
    expect(await codes(`zt-${tag.slice(-5)}`)).toEqual([`ZT-${tag.slice(-5)}`]);
  });

  it('el total que devuelve es el de la búsqueda, no el de la tabla', async () => {
    const [rows, total] = await repo.findAll({ q: `sofia ${tag}`, take: 50 });
    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
  });

  it('un % tecleado por el usuario es un porcentaje, no un comodín', async () => {
    expect(await codes(`%${tag}`)).toEqual([]);
  });

  it('se combina con el resto de los filtros en vez de reemplazarlos', async () => {
    const from = new Date(Date.UTC(2026, 8, 21, 0, 0, 0));
    expect(await codes(`${tag}`)).toHaveLength(2);
    const [rows] = await repo.findAll({ q: `${tag}`, from, take: 50 });
    expect(rows.map((a) => a.code)).toEqual([`ZY-${tag.slice(-5)}`]);
  });
});
