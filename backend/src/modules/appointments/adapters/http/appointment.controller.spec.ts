import { AppointmentController } from './appointment.controller';

describe('AppointmentController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'a1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'a1', patientId: 'p1' }),
    confirm: jest.fn().mockResolvedValue({ id: 'a1', status: 'CONFIRMED' }),
    cancel: jest.fn().mockResolvedValue({ id: 'a1', status: 'CANCELLED' }),
    reschedule: jest.fn().mockResolvedValue({ id: 'a1' }),
    complete: jest.fn().mockResolvedValue({ id: 'a1', status: 'COMPLETED' }),
  };
  const controller = new AppointmentController(service);
  const admin = { sub: 'u1', role: 'ADMIN' };
  const adminReq = { user: admin } as any;
  const patient = { sub: 'u2', role: 'DOCTOR' };
  const patientReq = { user: patient } as any;

  beforeEach(() => jest.clearAllMocks());

  it('create pasa el actor al service', async () => {
    const dto = { doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' };
    await controller.create(dto, patientReq);
    expect(service.create).toHaveBeenCalledWith(dto, patient);
  });

  it('findAll pasa user context del request', async () => {
    await controller.findAll({}, patientReq);
    expect(service.findAll).toHaveBeenCalledWith({}, 'u2', 'DOCTOR');
  });

  it('findOne pasa el actor al service', async () => {
    await controller.findOne('a1', patientReq);
    expect(service.findOne).toHaveBeenCalledWith('a1', patient);
  });

  it('confirm pasa el actor al service', async () => {
    await controller.confirm('a1', adminReq);
    expect(service.confirm).toHaveBeenCalledWith('a1', admin);
  });

  it('cancel pasa dto y actor al service', async () => {
    await controller.cancel('a1', { reason: 'Personal' }, patientReq);
    expect(service.cancel).toHaveBeenCalledWith('a1', { reason: 'Personal' }, patient);
  });

  it('reschedule pasa dto y actor al service', async () => {
    await controller.reschedule('a1', { dateTime: '2026-09-08T10:00:00Z' }, adminReq);
    expect(service.reschedule).toHaveBeenCalledWith('a1', { dateTime: '2026-09-08T10:00:00Z' }, admin);
  });

  it('complete pasa dto y actor al service', async () => {
    await controller.complete('a1', {}, adminReq);
    expect(service.complete).toHaveBeenCalledWith('a1', {}, admin);
  });
});
