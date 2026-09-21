import { PatientService } from './patient.service';
import { Patient } from '../domain/patient';

describe('PatientService', () => {
  const patients: any = { findById: jest.fn(), findAll: jest.fn(), findByIds: jest.fn(), save: jest.fn(), update: jest.fn() };

  const service = () => new PatientService(patients);

  beforeEach(() => {
    jest.clearAllMocks();
    patients.findById.mockResolvedValue(undefined);
    patients.findAll.mockResolvedValue([[], 0]);
  });

  describe('create', () => {
    it('crea paciente con identidad propia (sin usuario)', async () => {
      patients.save.mockImplementation(async (p: Patient) => p);
      const result = await service().create({ name: 'Ana Pérez', email: 'ana@test.com', phone: '123' });
      expect(result.name).toBe('Ana Pérez');
      expect(result.email).toBe('ana@test.com');
      expect(result.phone).toBe('123');
      expect(result).not.toHaveProperty('userId');
    });

    it('email es opcional', async () => {
      patients.save.mockImplementation(async (p: Patient) => p);
      const result = await service().create({ name: 'Sin Mail' });
      expect(result.email).toBeNull();
    });
  });

  describe('findAll', () => {
    it('pasa el término de búsqueda recortado al repositorio', async () => {
      await service().findAll({ q: '  Pérez  ', page: 2, limit: 10 });
      expect(patients.findAll).toHaveBeenCalledWith({ skip: 10, take: 10, q: 'Pérez' });
    });

    it('un término vacío es lo mismo que no buscar', async () => {
      await service().findAll({ q: '   ' });
      expect(patients.findAll).toHaveBeenCalledWith({ skip: 0, take: 20, q: undefined });
    });

    it('retorna lista de pacientes', async () => {
      patients.findAll.mockResolvedValue([[new Patient('p1', 'Ana', null)], 1]);
      const result = await service().findAll();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('retorna paciente existente', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'Ana', null));
      await expect(service().findOne('p1')).resolves.toMatchObject({ id: 'p1', name: 'Ana' });
    });

    it('lanza 404 si no existe', async () => {
      await expect(service().findOne('missing')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('update', () => {
    it('actualiza campos parcialmente incluyendo name y email', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'Ana', null));
      const result = await service().update('p1', { name: 'Ana María', email: 'am@test.com', phone: '999' });
      expect(result.name).toBe('Ana María');
      expect(result.email).toBe('am@test.com');
      expect(result.phone).toBe('999');
      expect(patients.update).toHaveBeenCalled();
    });

    it('actualiza todos los campos', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'Ana', null));
      const result = await service().update('p1', {
        phone: '111', dateOfBirth: '2000-01-01', address: 'Av. Rivadavia', insuranceNumber: 'OS-999', active: false,
      });
      expect(result.phone).toBe('111');
      expect(result.dateOfBirth).toBe('2000-01-01');
      expect(result.address).toBe('Av. Rivadavia');
      expect(result.insuranceNumber).toBe('OS-999');
      expect(result.active).toBe(false);
    });

    it('no modifica campos ausentes', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'Ana', 'a@t.com', '123', '2000-01-01', 'dir', 'os'));
      const result = await service().update('p1', { phone: undefined });
      expect(result.phone).toBe('123');
      expect(result.name).toBe('Ana');
    });

    it('lanza 404 si no existe', async () => {
      await expect(service().update('missing', { phone: '123' })).rejects.toMatchObject({ status: 404 });
    });
  });
});
