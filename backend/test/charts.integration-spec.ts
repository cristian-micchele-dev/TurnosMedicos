import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppointmentOrmEntity } from '../src/modules/appointments/adapters/persistence/appointment.entity';
import { SpecialtyOrmEntity } from '../src/modules/specialties/adapters/persistence/specialty.entity';
import { ChartsService } from '../src/modules/dashboard/charts.service';

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

/**
 * Los tres gráficos son consultas de agregación: lo único que prueba algo es
 * correrlas contra Postgres. Un mock del QueryBuilder confirmaría que escribí lo
 * que escribí, no que la base agrupe como esperamos.
 *
 * Las mediciones van como DIFERENCIA contra un estado inicial: dos de las tres
 * consultas no filtran por fecha y cuentan toda la tabla, así que afirmar
 * totales absolutos ataría el test a lo que ya haya en la base.
 */
describeDatabase('ChartsService (PostgreSQL)', () => {
  let dataSource: DataSource;
  let charts: ChartsService;

  const tag = `cht-${Date.now()}`;
  const specialtyId = randomUUID();
  const userId = randomUUID();
  const doctorId = randomUUID();
  const patientId = randomUUID();
  const appointmentIds: string[] = [];
  const especialidad = `Neumonología ${tag}`;

  /** `when` en hora de Buenos Aires: así se piensa un turno en la clínica. */
  const addAppointment = async (when: string, status = 'COMPLETED') => {
    const id = randomUUID();
    appointmentIds.push(id);
    await dataSource.query(
      `INSERT INTO appointments (id, code, doctor_id, patient_id, specialty_id, date_time, duration_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, 30, $7)`,
      [id, `CH-${appointmentIds.length}-${tag.slice(-6)}`, doctorId, patientId, specialtyId, when, status],
    );
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres', url: databaseUrl, entities: [AppointmentOrmEntity, SpecialtyOrmEntity],
      migrations: ['src/database/migrations/*.ts'],
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    charts = new ChartsService(
      dataSource.getRepository(AppointmentOrmEntity),
      dataSource.getRepository(SpecialtyOrmEntity),
    );

    await dataSource.query('INSERT INTO specialties (id, name) VALUES ($1, $2)', [specialtyId, especialidad]);
    await dataSource.query(
      `INSERT INTO users (id, email, name, password_hash, role) VALUES ($1, $2, $3, 'x', 'DOCTOR')`,
      [userId, `ch.${tag}@mail.com`, `Médico ${tag}`],
    );
    await dataSource.query(
      'INSERT INTO doctors (id, user_id, specialty_id, license_number) VALUES ($1, $2, $3, $4)',
      [doctorId, userId, specialtyId, `MP-${tag}`],
    );
    await dataSource.query('INSERT INTO patients (id, name) VALUES ($1, $2)', [patientId, `Paciente ${tag}`]);
  }, 60_000);

  afterAll(async () => {
    if (appointmentIds.length) await dataSource.query('DELETE FROM appointments WHERE id = ANY($1)', [appointmentIds]);
    await dataSource.query('DELETE FROM patients WHERE id = $1', [patientId]);
    await dataSource.query('DELETE FROM doctors WHERE id = $1', [doctorId]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.query('DELETE FROM specialties WHERE id = $1', [specialtyId]);
    if (dataSource?.isInitialized) await dataSource.destroy();
  }, 30_000);

  /** Mes calendario de la clínica, hace `atras` meses. */
  const mesClinica = (atras: number, hora = 15) => {
    const hoy = new Date();
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - atras, 15, hora, 0, 0));
    return { iso: d.toISOString(), clave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` };
  };

  it('cuenta por estado, y cada estado con su etiqueta en castellano', async () => {
    const antes = await charts.getCharts();
    const cuenta = (etiqueta: string, datos: { status: string; count: number }[]) =>
      datos.find((d) => d.status === etiqueta)?.count ?? 0;

    // Horas distintas: la base impide que un médico tenga dos turnos en el mismo instante.
    await addAppointment(mesClinica(0, 13).iso, 'COMPLETED');
    await addAppointment(mesClinica(0, 14).iso, 'COMPLETED');
    await addAppointment(mesClinica(0, 16).iso, 'CANCELLED');

    const despues = await charts.getCharts();
    expect(cuenta('Completado', despues.appointmentsByStatus) - cuenta('Completado', antes.appointmentsByStatus)).toBe(2);
    expect(cuenta('Cancelado', despues.appointmentsByStatus) - cuenta('Cancelado', antes.appointmentsByStatus)).toBe(1);
  });

  it('el top de especialidades trae como mucho cinco, de mayor a menor', async () => {
    const { topSpecialties } = await charts.getCharts();
    expect(topSpecialties.length).toBeLessThanOrEqual(5);
    const cuentas = topSpecialties.map((s) => s.count);
    expect([...cuentas].sort((a, b) => b - a)).toEqual(cuentas);
  });

  it('devuelve siempre seis meses: los vacíos van en cero, no se saltean', async () => {
    const { appointmentsByMonth } = await charts.getCharts();
    expect(appointmentsByMonth).toHaveLength(6);
    expect(appointmentsByMonth.every((m) => typeof m.count === 'number')).toBe(true);
  });

  // El caso que importa: 22:00 en Buenos Aires es la 01:00 del día siguiente en
  // UTC. Si se agrupa por el reloj del servidor, el último turno de un mes cae
  // en el mes que viene y los dos gráficos mienten.
  it('un turno de las 22:00 del último día del mes cuenta en ESE mes, no en el siguiente', async () => {
    const hoy = new Date();
    const finDeMesPasado = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 0, 0, 0, 0));
    const anio = finDeMesPasado.getUTCFullYear();
    const mes = finDeMesPasado.getUTCMonth() + 1;
    const dia = finDeMesPasado.getUTCDate();
    const aLasDiezDeLaNoche = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')} 22:00:00-03`;

    const antes = (await charts.getCharts()).appointmentsByMonth.map((m) => m.count);
    await addAppointment(aLasDiezDeLaNoche);
    const despues = (await charts.getCharts()).appointmentsByMonth.map((m) => m.count);

    // Índice 4 = el mes pasado (el 5 es el actual) en una ventana de seis meses.
    const diferencias = despues.map((n, i) => n - antes[i]);
    expect(diferencias[4]).toBe(1);
    expect(diferencias[5]).toBe(0);
  });
});
