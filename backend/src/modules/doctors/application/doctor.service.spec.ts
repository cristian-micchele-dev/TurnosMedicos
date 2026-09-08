import { DoctorService } from './doctor.service';
import { Doctor } from '../domain/doctor';
import { Availability } from '../domain/availability';
import { Role, User } from '../../users/domain/user';
import { Specialty } from '../../specialties/domain/specialty';

describe('DoctorService', () => {
  const doctors: any = { findById: jest.fn(), findByUserId: jest.fn(), findByLicense: jest.fn(), findAll: jest.fn(), save: jest.fn(), update: jest.fn() };
  const availabilities: any = { findByDoctor: jest.fn(), findByDoctorAndDay: jest.fn(), save: jest.fn(), deleteByDoctor: jest.fn() };
  const specialties: any = { findById: jest.fn() };
  const users: any = { findById: jest.fn(), findByEmail: jest.fn(), save: jest.fn(), update: jest.fn() };

  const service = () => new DoctorService(doctors, availabilities, specialties, users);

  beforeEach(() => {
    jest.clearAllMocks();
    doctors.findById.mockResolvedValue(undefined);
    doctors.findByUserId.mockResolvedValue(undefined);
    doctors.findByLicense.mockResolvedValue(undefined);
    doctors.findAll.mockResolvedValue([]);
    availabilities.findByDoctor.mockResolvedValue([]);
    availabilities.findByDoctorAndDay.mockResolvedValue([]);
    specialties.findById.mockResolvedValue(undefined);
    users.findById.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('crea médico cuando usuario es DOCTOR y validaciones pasan', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@test.com', '', 'hash', Role.DOCTOR));
      specialties.findById.mockResolvedValue(new Specialty('s1', 'Cardiología'));
      doctors.save.mockImplementation(async (d: Doctor) => d);
      const result = await service().create({ userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-123' });
      expect(result.userId).toBe('u1');
      expect(result.specialtyId).toBe('s1');
    });

    it('rechaza si usuario no tiene rol DOCTOR', async () => {
      users.findById.mockResolvedValue(new User('u1', 'pat@test.com', '', 'hash', Role.PATIENT));
      await expect(service().create({ userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-123' })).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza si usuario ya tiene perfil de médico', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@test.com', '', 'hash', Role.DOCTOR));
      doctors.findByUserId.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-999'));
      await expect(service().create({ userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-123' })).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza matrícula duplicada', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@test.com', '', 'hash', Role.DOCTOR));
      doctors.findByLicense.mockResolvedValue(new Doctor('d2', 'u2', 's1', 'MP-123'));
      await expect(service().create({ userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-123' })).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza si especialidad no existe', async () => {
      users.findById.mockResolvedValue(new User('u1', 'doc@test.com', '', 'hash', Role.DOCTOR));
      await expect(service().create({ userId: 'u1', specialtyId: 'bad', licenseNumber: 'MP-123' })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('findAll', () => {
    it('retorna médicos activos', async () => {
      doctors.findAll.mockResolvedValue([new Doctor('d1', 'u1', 's1', 'MP-1')]);
      const result = await service().findAll();
      expect(result).toHaveLength(1);
      expect(doctors.findAll).toHaveBeenCalledWith({ active: true });
    });

    it('filtra por especialidad', async () => {
      await service().findAll({ specialtyId: 's1' });
      expect(doctors.findAll).toHaveBeenCalledWith({ specialtyId: 's1', active: true });
    });
  });

  describe('findOne / findByUserId', () => {
    it('retorna médico existente', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      await expect(service().findOne('d1')).resolves.toMatchObject({ id: 'd1' });
    });

    it('lanza 404 si no existe', async () => {
      await expect(service().findOne('missing')).rejects.toMatchObject({ status: 404 });
    });

    it('busca por userId', async () => {
      doctors.findByUserId.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      await expect(service().findByUserId('u1')).resolves.toMatchObject({ userId: 'u1' });
    });
  });

  describe('update', () => {
    it('actualiza campos parcialmente', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      const result = await service().update('d1', { phone: '1155667788' });
      expect(result.phone).toBe('1155667788');
      expect(doctors.update).toHaveBeenCalled();
    });

    it('valida especialidad al cambiarla', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      await expect(service().update('d1', { specialtyId: 'bad' })).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza matrícula duplicada de otro médico', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      doctors.findByLicense.mockResolvedValue(new Doctor('d2', 'u2', 's1', 'MP-999'));
      await expect(service().update('d1', { licenseNumber: 'MP-999' })).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('setAvailability', () => {
    it('reemplaza disponibilidad completa', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      availabilities.save.mockImplementation(async (a: Availability) => a);
      const result = await service().setAvailability('d1', { slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] });
      expect(availabilities.deleteByDoctor).toHaveBeenCalledWith('d1');
      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(1);
    });

    it('lanza 404 si médico no existe', async () => {
      await expect(service().setAvailability('missing', { slots: [] })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('getAvailability', () => {
    it('retorna toda la disponibilidad sin fecha', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      availabilities.findByDoctor.mockResolvedValue([new Availability('a1', 'd1', 1, '09:00', '13:00', 30)]);
      const result = await service().getAvailability('d1');
      expect(result).toHaveLength(1);
    });

    it('genera slots para una fecha específica', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      // 2026-09-07 es lunes (dayOfWeek=1)
      availabilities.findByDoctorAndDay.mockResolvedValue([new Availability('a1', 'd1', 1, '09:00', '11:00', 30)]);
      const result = await service().getAvailability('d1', '2026-09-07');
      expect((result[0] as any).slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });
  });
});
