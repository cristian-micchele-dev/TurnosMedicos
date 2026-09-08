import { AppointmentController } from './appointment.controller';

describe('AppointmentController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'a1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'a1', patientId: 'p1' }),
    confirm: jest.fn().mockResolvedValue({ id: 'a1', status: 'CONFIRMED' }),
    cancel: jest.fn().mockResolvedValue({ id: 'a1', status: 'CANCELLED' }),
    complete: jest.fn().mockResolvedValue({ id: 'a1', status: 'COMPLETED' }),
  };
  const patientService: any = {
    findOne: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' }),
  };
  const controller = new AppointmentController(service, patientService);
  const adminReq = { user: { sub: 'u1', role: 'ADMIN' } } as any;
  const patientReq = { user: { sub: 'u1', role: 'PATIENT' } } as any;

  it('create delega al service', async () => {
    await controller.create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }, adminReq);
    expect(service.create).toHaveBeenCalled();
  });

  it('findAll pasa user context del request', async () => {
    await controller.findAll({}, patientReq);
    expect(service.findAll).toHaveBeenCalledWith({}, 'u1', 'PATIENT');
  });

  it('findOne delega al service', async () => {
    await controller.findOne('a1');
    expect(service.findOne).toHaveBeenCalledWith('a1');
  });

  it('confirm delega al service', async () => {
    await controller.confirm('a1');
    expect(service.confirm).toHaveBeenCalledWith('a1');
  });

  it('cancel delega al service', async () => {
    await controller.cancel('a1', { reason: 'Personal' }, adminReq);
    expect(service.cancel).toHaveBeenCalledWith('a1', { reason: 'Personal' });
  });

  it('complete delega al service', async () => {
    await controller.complete('a1');
    expect(service.complete).toHaveBeenCalledWith('a1');
  });
});
