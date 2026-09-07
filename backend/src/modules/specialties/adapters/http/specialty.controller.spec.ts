import { SpecialtyController } from './specialty.controller';

describe('SpecialtyController', () => {
  const service: any = {
    create: jest.fn().mockResolvedValue({ id: '1', name: 'Cardiología' }),
    findAll: jest.fn().mockResolvedValue([{ id: '1', name: 'Cardiología' }]),
    findOne: jest.fn().mockResolvedValue({ id: '1', name: 'Cardiología' }),
    update: jest.fn().mockResolvedValue({ id: '1', name: 'Cardio Actualizada' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new SpecialtyController(service);

  it('findAll delega al service con filtro activo por defecto', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('findAll incluye inactivas con query all=true', async () => {
    await controller.findAll('true');
    expect(service.findAll).toHaveBeenCalledWith(false);
  });

  it('findOne delega al service', async () => {
    const result = await controller.findOne('1');
    expect(result.name).toBe('Cardiología');
  });

  it('create delega al service', async () => {
    const result = await controller.create({ name: 'Cardiología' });
    expect(result.name).toBe('Cardiología');
  });

  it('update delega al service', async () => {
    const result = await controller.update('1', { name: 'Cardio Actualizada' });
    expect(result.name).toBe('Cardio Actualizada');
  });

  it('remove delega al service', async () => {
    await expect(controller.remove('1')).resolves.toBeUndefined();
  });
});
