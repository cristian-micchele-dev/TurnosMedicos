import { PatientController } from './patient.controller';

describe('PatientController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
    findByUserId: jest.fn().mockResolvedValue({ id: 'p1' }),
    update: jest.fn().mockResolvedValue({ id: 'p1' }),
  };
  const controller = new PatientController(service);

  it('create delega al service', async () => {
    await controller.create({ userId: 'u1' });
    expect(service.create).toHaveBeenCalled();
  });

  it('findAll delega al service', async () => {
    await controller.findAll({});
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findMe extrae userId del request', async () => {
    await controller.findMe({ user: { sub: 'u1' } } as any);
    expect(service.findByUserId).toHaveBeenCalledWith('u1');
  });

  it('findOne delega al service', async () => {
    await controller.findOne('p1');
    expect(service.findOne).toHaveBeenCalledWith('p1');
  });

  it('update delega al service', async () => {
    await controller.update('p1', { phone: '123' }, { user: { sub: 'u1', role: 'ADMIN' } } as any);
    expect(service.update).toHaveBeenCalledWith('p1', { phone: '123' });
  });
});
