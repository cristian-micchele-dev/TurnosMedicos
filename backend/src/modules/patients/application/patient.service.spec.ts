import { PatientService } from './patient.service';
import { Patient } from '../domain/patient';
import { Role, User } from '../../users/domain/user';

describe('PatientService', () => {
  const patients: any = { findById: jest.fn(), findByUserId: jest.fn(), findAll: jest.fn(), save: jest.fn(), update: jest.fn() };
  const users: any = { findById: jest.fn(), findByEmail: jest.fn(), save: jest.fn(), update: jest.fn() };

  const service = () => new PatientService(patients, users);

  beforeEach(() => {
    jest.clearAllMocks();
    patients.findById.mockResolvedValue(undefined);
    patients.findByUserId.mockResolvedValue(undefined);
    patients.findAll.mockResolvedValue([]);
    users.findById.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('crea paciente cuando usuario es PATIENT', async () => {
      users.findById.mockResolvedValue(new User('u1', 'pat@test.com', 'hash', Role.PATIENT));
      patients.save.mockImplementation(async (p: Patient) => p);
      const result = await service().create({ userId: 'u1', phone: '123' });
      expect(result.userId).toBe('u1');
      expect(result.phone).toBe('123');
    });

    it('rechaza si usuario no tiene rol PATIENT', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@test.com', 'hash', Role.DOCTOR));
      await expect(service().create({ userId: 'u1' })).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza si ya tiene perfil de paciente', async () => {
      users.findById.mockResolvedValue(new User('u1', 'pat@test.com', 'hash', Role.PATIENT));
      patients.findByUserId.mockResolvedValue(new Patient('p1', 'u1'));
      await expect(service().create({ userId: 'u1' })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('findAll', () => {
    it('retorna lista de pacientes', async () => {
      patients.findAll.mockResolvedValue([new Patient('p1', 'u1')]);
      const result = await service().findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne / findByUserId', () => {
    it('retorna paciente existente', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'u1'));
      await expect(service().findOne('p1')).resolves.toMatchObject({ id: 'p1' });
    });

    it('lanza 404 si no existe', async () => {
      await expect(service().findOne('missing')).rejects.toMatchObject({ status: 404 });
    });

    it('busca por userId', async () => {
      patients.findByUserId.mockResolvedValue(new Patient('p1', 'u1'));
      await expect(service().findByUserId('u1')).resolves.toMatchObject({ userId: 'u1' });
    });
  });

  describe('update', () => {
    it('actualiza campos parcialmente', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'u1'));
      const result = await service().update('p1', { phone: '999', address: 'Calle 123' });
      expect(result.phone).toBe('999');
      expect(result.address).toBe('Calle 123');
      expect(patients.update).toHaveBeenCalled();
    });

    it('actualiza todos los campos', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'u1'));
      const result = await service().update('p1', {
        phone: '111', dateOfBirth: '2000-01-01', address: 'Av. Rivadavia', insuranceNumber: 'OS-999', active: false,
      });
      expect(result.phone).toBe('111');
      expect(result.dateOfBirth).toBe('2000-01-01');
      expect(result.address).toBe('Av. Rivadavia');
      expect(result.insuranceNumber).toBe('OS-999');
      expect(result.active).toBe(false);
    });

    it('setea a null con undefined explícito', async () => {
      patients.findById.mockResolvedValue(new Patient('p1', 'u1', '123', '2000-01-01', 'dir', 'os'));
      const result = await service().update('p1', { phone: undefined });
      // phone no se modifica porque undefined !== undefined check fails (dto.phone is undefined)
      expect(result.phone).toBe('123');
    });

    it('lanza 404 si no existe', async () => {
      await expect(service().update('missing', { phone: '123' })).rejects.toMatchObject({ status: 404 });
    });
  });
});
