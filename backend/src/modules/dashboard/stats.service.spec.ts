import { StatsService } from './stats.service';
import { Role, User } from '../users/domain/user';

describe('StatsService', () => {
  const users: any = { findAll: jest.fn() };
  const patients: any = { findAll: jest.fn() };
  const service = () => new StatsService(users, patients);

  beforeEach(() => {
    jest.clearAllMocks();
    users.findAll.mockResolvedValue([[
      new User('u1', 'a@h.com', 'Admin', 'hash', Role.ADMIN),
      new User('u2', 'd@h.com', 'Doc', 'hash', Role.DOCTOR),
      new User('u3', 's@h.com', 'Sec', 'hash', Role.SECRETARY),
    ], 3]);
    patients.findAll.mockResolvedValue([[], 42]);
  });

  it('ADMIN ve el censo completo del sistema', async () => {
    const stats = await service().getStats(Role.ADMIN);
    expect(stats).toEqual(expect.objectContaining({ totalDoctors: 1, totalPatients: 42, totalUsers: 3, activeUsers: 3 }));
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
