import { SpecialtyService } from './specialty.service';
import { Specialty } from '../domain/specialty';

describe('SpecialtyService', () => {
  const repo: any = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const service = () => new SpecialtyService(repo);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findById.mockResolvedValue(undefined);
    repo.findByName.mockResolvedValue(undefined);
    repo.findAll.mockResolvedValue([]);
  });

  describe('create', () => {
    it('crea una especialidad y normaliza el nombre', async () => {
      repo.findByName.mockResolvedValue(undefined);
      repo.save.mockImplementation(async (s: Specialty) => s);
      const result = await service().create({ name: '  Cardiología  ', description: 'Corazón' });
      expect(result.name).toBe('Cardiología');
      expect(result.description).toBe('Corazón');
      expect(repo.save).toHaveBeenCalled();
    });

    it('crea sin descripción (null por defecto)', async () => {
      repo.save.mockImplementation(async (s: Specialty) => s);
      const result = await service().create({ name: 'Neurología' });
      expect(result.description).toBeNull();
    });

    it('rechaza nombre duplicado', async () => {
      repo.findByName.mockResolvedValue(new Specialty('x', 'Cardiología'));
      await expect(service().create({ name: 'Cardiología' })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('findAll', () => {
    it('retorna lista de especialidades activas', async () => {
      repo.findAll.mockResolvedValue([new Specialty('1', 'A'), new Specialty('2', 'B')]);
      const result = await service().findAll();
      expect(result).toHaveLength(2);
      expect(repo.findAll).toHaveBeenCalledWith(true);
    });

    it('incluye inactivas cuando se pide', async () => {
      repo.findAll.mockResolvedValue([]);
      await service().findAll(false);
      expect(repo.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('retorna especialidad existente', async () => {
      repo.findById.mockResolvedValue(new Specialty('1', 'Pediatría'));
      const result = await service().findOne('1');
      expect(result.name).toBe('Pediatría');
    });

    it('lanza error si no existe', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service().findOne('missing')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('update', () => {
    it('actualiza campos parcialmente', async () => {
      repo.findById.mockResolvedValue(new Specialty('1', 'Cardio', 'desc'));
      const result = await service().update('1', { name: 'Cardiología' });
      expect(result.name).toBe('Cardiología');
      expect(result.description).toBe('desc');
      expect(repo.update).toHaveBeenCalled();
    });

    it('rechaza rename a nombre existente de otra especialidad', async () => {
      repo.findById.mockResolvedValue(new Specialty('1', 'Cardio'));
      repo.findByName.mockResolvedValue(new Specialty('2', 'Dermatología'));
      await expect(service().update('1', { name: 'Dermatología' })).rejects.toMatchObject({ status: 409 });
    });

    it('permite guardar el mismo nombre para la misma especialidad', async () => {
      const s = new Specialty('1', 'Cardiología');
      repo.findById.mockResolvedValue(s);
      repo.findByName.mockResolvedValue(s);
      await expect(service().update('1', { name: 'Cardiología' })).resolves.toBeDefined();
    });

    it('lanza error si no existe', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service().update('missing', { name: 'X' })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('remove', () => {
    it('hace soft delete (active=false)', async () => {
      const s = new Specialty('1', 'A');
      repo.findById.mockResolvedValue(s);
      await service().remove('1');
      expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });

    it('lanza error si no existe', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service().remove('missing')).rejects.toMatchObject({ status: 404 });
    });
  });
});
