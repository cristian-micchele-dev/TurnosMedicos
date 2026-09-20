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
    addBlock: jest.fn().mockResolvedValue({ id: 'b1' }),
    removeBlock: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new DoctorController(service);
  const doctor = { sub: 'u1', role: 'DOCTOR' };
  const doctorReq = { user: doctor } as any;

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

  it('update pasa el actor al service', async () => {
    await controller.update('d1', { phone: '123' }, doctorReq);
    expect(service.update).toHaveBeenCalledWith('d1', { phone: '123' }, doctor);
  });

  it('setAvailability pasa el actor al service', async () => {
    await controller.setAvailability('d1', { slots: [] }, doctorReq);
    expect(service.setAvailability).toHaveBeenCalledWith('d1', { slots: [] }, doctor);
  });

  it('addBlock y removeBlock pasan el actor al service', async () => {
    const dto = { startDate: '2026-10-01T00:00:00Z', endDate: '2026-10-02T00:00:00Z' };
    await controller.addBlock('d1', dto, doctorReq);
    expect(service.addBlock).toHaveBeenCalledWith('d1', dto, doctor);
    await controller.removeBlock('d1', 'b1', doctorReq);
    expect(service.removeBlock).toHaveBeenCalledWith('d1', 'b1', doctor);
  });

  it('getAvailability pasa fecha opcional', async () => {
    await controller.getAvailability('d1', '2026-09-07');
    expect(service.getAvailability).toHaveBeenCalledWith('d1', '2026-09-07');
  });
});
