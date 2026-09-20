import { PatientController } from './patient.controller';

describe('PatientController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
    update: jest.fn().mockResolvedValue({ id: 'p1' }),
  };
  const controller = new PatientController(service);

  it('create delega al service', async () => {
    await controller.create({ name: 'Ana' });
    expect(service.create).toHaveBeenCalledWith({ name: 'Ana' });
  });

  it('findAll delega al service', async () => {
    await controller.findAll({});
    expect(service.findAll).toHaveBeenCalled();
  });

  it('no expone /me: el paciente no tiene sesión', () => {
    expect((controller as any).findMe).toBeUndefined();
  });

  it('findOne delega al service', async () => {
    await controller.findOne('p1');
    expect(service.findOne).toHaveBeenCalledWith('p1');
  });

  it('update delega al service', async () => {
    await controller.update('p1', { phone: '123' });
    expect(service.update).toHaveBeenCalledWith('p1', { phone: '123' });
  });
});
