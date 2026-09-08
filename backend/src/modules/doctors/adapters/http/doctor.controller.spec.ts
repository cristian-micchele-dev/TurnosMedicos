import { DoctorController } from './doctor.controller';

describe('DoctorController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'd1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'd1' }),
    findByUserId: jest.fn().mockResolvedValue({ id: 'd1' }),
    update: jest.fn().mockResolvedValue({ id: 'd1' }),
    setAvailability: jest.fn().mockResolvedValue([]),
    getAvailability: jest.fn().mockResolvedValue([]),
  };
  const controller = new DoctorController(service);

  it('create delega al service', async () => {
    await controller.create({ userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-1' });
    expect(service.create).toHaveBeenCalled();
  });

  it('findAll pasa filtro de especialidad', async () => {
    await controller.findAll('s1');
    expect(service.findAll).toHaveBeenCalledWith({ specialtyId: 's1' }, undefined);
  });

  it('findAll sin filtro', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
  });

  it('findMe extrae userId del request', async () => {
    await controller.findMe({ user: { sub: 'u1' } } as any);
    expect(service.findByUserId).toHaveBeenCalledWith('u1');
  });

  it('findOne delega al service', async () => {
    await controller.findOne('d1');
    expect(service.findOne).toHaveBeenCalledWith('d1');
  });

  it('update delega al service', async () => {
    await controller.update('d1', { phone: '123' });
    expect(service.update).toHaveBeenCalledWith('d1', { phone: '123' });
  });

  it('setAvailability delega al service', async () => {
    await controller.setAvailability('d1', { slots: [] });
    expect(service.setAvailability).toHaveBeenCalledWith('d1', { slots: [] });
  });

  it('getAvailability pasa fecha opcional', async () => {
    await controller.getAvailability('d1', '2026-09-07');
    expect(service.getAvailability).toHaveBeenCalledWith('d1', '2026-09-07');
  });
});
