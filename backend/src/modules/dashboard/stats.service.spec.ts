import { StatsService } from './stats.service';
import { Role } from '../users/domain/user';

describe('StatsService', () => {
  const users: any = { findAll: jest.fn(), countAll: jest.fn() };
  const patients: any = { findAll: jest.fn() };
  const doctors: any = { findAll: jest.fn() };
  const service = () => new StatsService(users, patients, doctors);

  beforeEach(() => {
    jest.clearAllMocks();
    users.countAll.mockResolvedValue({ total: 3, active: 3 });
    patients.findAll.mockResolvedValue([[], 42]);
    // Dos cuentas con rol DOCTOR, pero una sola tiene perfil médico: el tablero cuenta perfiles.
    doctors.findAll.mockResolvedValue([[], 1]);
  });

  it('ADMIN ve el censo completo del sistema', async () => {
    const stats = await service().getStats(Role.ADMIN);
    expect(stats).toEqual(expect.objectContaining({ totalDoctors: 1, totalPatients: 42, totalUsers: 3, activeUsers: 3 }));
  });

  it('cuenta médicos agendables, no cuentas con rol DOCTOR', async () => {
    // Tres cuentas, dos con rol DOCTOR; un solo perfil médico.
    users.countAll.mockResolvedValue({ total: 3, active: 3 });
    doctors.findAll.mockResolvedValue([[], 1]);
    const stats = await service().getStats(Role.ADMIN);
    expect(stats.totalDoctors).toBe(1);
    expect(doctors.findAll).toHaveBeenCalledWith({ active: true, take: 1 });
  });

  it('SECRETARY ve el mostrador: médicos y pacientes, nunca el censo de usuarios', async () => {
    const stats = await service().getStats(Role.SECRETARY);
    expect(stats).toEqual({ totalDoctors: 1, totalPatients: 42 });
  });

  it('DOCTOR no recibe totales del hospital', async () => {
    const stats = await service().getStats(Role.DOCTOR);
    expect(stats).not.toHaveProperty('totalUsers');
    expect(stats).not.toHaveProperty('totalPatients');
  });
});

describe('StatsService — contar no es traer', () => {
  const users: any = { findAll: jest.fn(), countAll: jest.fn() };
  const patients: any = { findAll: jest.fn() };
  const doctors: any = { findAll: jest.fn() };
  const service = () => new StatsService(users, patients, doctors);

  beforeEach(() => {
    jest.clearAllMocks();
    users.countAll.mockResolvedValue({ total: 12_000, active: 11_540 });
    patients.findAll.mockResolvedValue([[], 42]);
    doctors.findAll.mockResolvedValue([[], 1]);
  });

  it('pide los totales a la base, sin traerse el padrón entero a memoria', async () => {
    const stats = await service().getStats(Role.ADMIN);
    expect(stats).toEqual(expect.objectContaining({ totalUsers: 12_000, activeUsers: 11_540 }));
    expect(users.findAll).not.toHaveBeenCalled();
  });

  it('a quien no ve el censo ni se lo pide a la base', async () => {
    await service().getStats(Role.SECRETARY);
    expect(users.countAll).not.toHaveBeenCalled();
  });
});
