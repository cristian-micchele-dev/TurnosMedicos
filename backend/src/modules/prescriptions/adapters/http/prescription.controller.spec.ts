import { PrescriptionController } from './prescription.controller';

describe('PrescriptionController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'rx1' }),
    findByAppointment: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'rx1' }),
    findByPatient: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
  const controller = new PrescriptionController(service);
  const actor = { sub: 'u1', role: 'DOCTOR' };
  const req = { user: actor } as any;

  it('create pasa el userId del actor', async () => {
    const dto = { medications: [] } as any;
    await controller.create('a1', dto, req);
    expect(service.create).toHaveBeenCalledWith('u1', 'a1', dto);
  });

  it('las lecturas pasan el actor completo al service', async () => {
    await controller.findByAppointment('a1', req);
    expect(service.findByAppointment).toHaveBeenCalledWith('a1', actor);
    await controller.findOne('rx1', req);
    expect(service.findOne).toHaveBeenCalledWith('rx1', actor);
    await controller.findByPatient('p1', 1, 10, req);
    expect(service.findByPatient).toHaveBeenCalledWith('p1', 1, 10, actor);
  });
});
