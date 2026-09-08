import { AppointmentService } from './appointment.service';
import { Appointment } from '../domain/appointment';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { InvalidStatusTransitionError } from '../domain/exceptions';
import { Doctor } from '../../doctors/domain/doctor';
import { Patient } from '../../patients/domain/patient';
import { Availability } from '../../doctors/domain/availability';
import { Role } from '../../users/domain/user';

describe('Appointment (domain)', () => {
  const make = (status: AppointmentStatus) =>
    new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, status);

  describe('confirm()', () => {
    it('transiciona de PENDING a CONFIRMED', () => {
      const a = make(AppointmentStatus.PENDING);
      a.confirm();
      expect(a.status).toBe(AppointmentStatus.CONFIRMED);
    });
    it('lanza InvalidStatusTransitionError si no está PENDING', () => {
      expect(() => make(AppointmentStatus.CONFIRMED).confirm()).toThrow(InvalidStatusTransitionError);
      expect(() => make(AppointmentStatus.CANCELLED).confirm()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('cancel()', () => {
    it('transiciona de PENDING a CANCELLED y guarda motivo', () => {
      const a = make(AppointmentStatus.PENDING);
      a.cancel('Personal');
      expect(a.status).toBe(AppointmentStatus.CANCELLED);
      expect(a.cancellationReason).toBe('Personal');
    });
    it('transiciona de CONFIRMED a CANCELLED', () => {
      const a = make(AppointmentStatus.CONFIRMED);
      a.cancel();
      expect(a.status).toBe(AppointmentStatus.CANCELLED);
      expect(a.cancellationReason).toBeNull();
    });
    it('lanza InvalidStatusTransitionError si ya está CANCELLED o COMPLETED', () => {
      expect(() => make(AppointmentStatus.CANCELLED).cancel()).toThrow(InvalidStatusTransitionError);
      expect(() => make(AppointmentStatus.COMPLETED).cancel()).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('complete()', () => {
    it('transiciona de CONFIRMED a COMPLETED', () => {
      const a = make(AppointmentStatus.CONFIRMED);
      a.complete();
      expect(a.status).toBe(AppointmentStatus.COMPLETED);
    });
    it('lanza InvalidStatusTransitionError si no está CONFIRMED', () => {
      expect(() => make(AppointmentStatus.PENDING).complete()).toThrow(InvalidStatusTransitionError);
      expect(() => make(AppointmentStatus.CANCELLED).complete()).toThrow(InvalidStatusTransitionError);
    });
  });
});

describe('AppointmentService', () => {
  const now = new Date('2026-09-06T12:00:00Z');
  const appointments: any = { findById: jest.fn(), findAll: jest.fn(), findByDoctorAndDateTime: jest.fn(), findByPatientSpecialtyAndDateRange: jest.fn(), save: jest.fn(), update: jest.fn() };
  const doctors: any = { findById: jest.fn(), findByUserId: jest.fn() };
  const availabilities: any = { findByDoctorAndDay: jest.fn() };
  const patients: any = { findById: jest.fn(), findByUserId: jest.fn() };
  const clock = { now: () => now };

  const service = () => new AppointmentService(appointments, doctors, availabilities, patients, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    appointments.findById.mockResolvedValue(undefined);
    appointments.findAll.mockResolvedValue([[], 0]);
    appointments.findByDoctorAndDateTime.mockResolvedValue([]);
    appointments.findByPatientSpecialtyAndDateRange.mockResolvedValue([]);
    doctors.findById.mockResolvedValue(undefined);
    doctors.findByUserId.mockResolvedValue(undefined);
    availabilities.findByDoctorAndDay.mockResolvedValue([]);
    patients.findById.mockResolvedValue(undefined);
    patients.findByUserId.mockResolvedValue(undefined);
  });

  const setupValidCreate = () => {
    doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
    patients.findById.mockResolvedValue(new Patient('p1', 'u2'));
    // lunes, bloque 09:00-17:00
    availabilities.findByDoctorAndDay.mockResolvedValue([new Availability('av1', 'd1', 1, '09:00', '17:00', 30)]);
    appointments.save.mockImplementation(async (a: Appointment) => a);
  };

  describe('create', () => {
    it('crea turno cuando todas las validaciones pasan', async () => {
      setupValidCreate();
      const result = await service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' });
      expect(result.doctorId).toBe('d1');
      expect(result.patientId).toBe('p1');
      expect(result.status).toBe(AppointmentStatus.PENDING);
    });

    it('rechaza si médico no existe', async () => {
      await expect(service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }))
        .rejects.toMatchObject({ status: 404 });
    });

    it('rechaza si paciente no existe', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      await expect(service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }))
        .rejects.toMatchObject({ status: 404 });
    });

    it('rechaza si está fuera de disponibilidad', async () => {
      doctors.findById.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      patients.findById.mockResolvedValue(new Patient('p1', 'u2'));
      // sin disponibilidad para lunes
      await expect(service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }))
        .rejects.toMatchObject({ status: 400, code: 'OUTSIDE_AVAILABILITY' });
    });

    it('rechaza double booking', async () => {
      setupValidCreate();
      const existing = new Appointment('a-existing', 'd1', 'p2', 's1', new Date('2026-09-07T10:00:00Z'), 30, AppointmentStatus.PENDING);
      appointments.findByDoctorAndDateTime.mockResolvedValue([existing]);
      await expect(service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }))
        .rejects.toMatchObject({ status: 409, code: 'TIME_SLOT_UNAVAILABLE' });
    });

    it('rechaza misma especialidad mismo día', async () => {
      setupValidCreate();
      const existing = new Appointment('a-existing', 'd1', 'p1', 's1', new Date('2026-09-07T09:00:00Z'), 30, AppointmentStatus.CONFIRMED);
      appointments.findByPatientSpecialtyAndDateRange.mockResolvedValue([existing]);
      await expect(service().create({ doctorId: 'd1', patientId: 'p1', dateTime: '2026-09-07T10:00:00Z' }))
        .rejects.toMatchObject({ status: 409, code: 'DUPLICATE_SPECIALTY_BOOKING' });
    });
  });

  describe('findAll', () => {
    it('filtra por paciente cuando rol es PATIENT', async () => {
      patients.findByUserId.mockResolvedValue(new Patient('p1', 'u2'));
      await service().findAll({}, 'u2', Role.PATIENT);
      expect(appointments.findAll).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
    });

    it('filtra por doctor cuando rol es DOCTOR', async () => {
      doctors.findByUserId.mockResolvedValue(new Doctor('d1', 'u1', 's1', 'MP-1'));
      await service().findAll({}, 'u1', Role.DOCTOR);
      expect(appointments.findAll).toHaveBeenCalledWith(expect.objectContaining({ doctorId: 'd1' }));
    });

    it('admin ve todo sin filtro forzado', async () => {
      await service().findAll({}, 'admin-id', Role.ADMIN);
      expect(appointments.findAll).toHaveBeenCalledWith(expect.not.objectContaining({ patientId: expect.anything() }));
    });

    it('pasa filtros from/to como Date', async () => {
      await service().findAll({ from: '2026-09-01', to: '2026-09-30' }, 'admin-id', Role.ADMIN);
      expect(appointments.findAll).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }));
    });

    it('lanza 404 si paciente no tiene perfil', async () => {
      await expect(service().findAll({}, 'u-no-profile', Role.PATIENT)).rejects.toMatchObject({ status: 404 });
    });

    it('lanza 404 si doctor no tiene perfil', async () => {
      await expect(service().findAll({}, 'u-no-profile', Role.DOCTOR)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('findOne', () => {
    it('lanza 404 si no existe', async () => {
      await expect(service().findOne('missing')).rejects.toMatchObject({ status: 404 });
    });

    it('retorna turno existente', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.PENDING);
      appointments.findById.mockResolvedValue(a);
      await expect(service().findOne('a1')).resolves.toMatchObject({ id: 'a1' });
    });
  });

  describe('confirm', () => {
    it('lanza 404 si turno no existe', async () => {
      await expect(service().confirm('missing')).rejects.toMatchObject({ status: 404 });
    });

    it('confirma turno pendiente', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.PENDING);
      appointments.findById.mockResolvedValue(a);
      const result = await service().confirm('a1');
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('rechaza confirmar turno no pendiente', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.CONFIRMED);
      appointments.findById.mockResolvedValue(a);
      await expect(service().confirm('a1')).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('cancel', () => {
    it('lanza 404 si turno no existe', async () => {
      await expect(service().cancel('missing', {})).rejects.toMatchObject({ status: 404 });
    });

    it('cancela turno con más de 24h de anticipación', async () => {
      const futureDate = new Date(now.getTime() + 25 * 3600000);
      const a = new Appointment('a1', 'd1', 'p1', 's1', futureDate, 30, AppointmentStatus.PENDING);
      appointments.findById.mockResolvedValue(a);
      const result = await service().cancel('a1', { reason: 'Personal' });
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Personal');
    });

    it('rechaza cancelar con menos de 24h', async () => {
      const soonDate = new Date(now.getTime() + 23 * 3600000);
      const a = new Appointment('a1', 'd1', 'p1', 's1', soonDate, 30, AppointmentStatus.PENDING);
      appointments.findById.mockResolvedValue(a);
      await expect(service().cancel('a1', {})).rejects.toMatchObject({ status: 400, code: 'CANCELLATION_TOO_LATE' });
    });

    it('rechaza cancelar turno ya cancelado', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.CANCELLED);
      appointments.findById.mockResolvedValue(a);
      await expect(service().cancel('a1', {})).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza cancelar turno completado', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.COMPLETED);
      appointments.findById.mockResolvedValue(a);
      await expect(service().cancel('a1', {})).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('complete', () => {
    it('lanza 404 si turno no existe', async () => {
      await expect(service().complete('missing')).rejects.toMatchObject({ status: 404 });
    });

    it('completa turno confirmado', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.CONFIRMED);
      appointments.findById.mockResolvedValue(a);
      const result = await service().complete('a1');
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('rechaza completar turno no confirmado', async () => {
      const a = new Appointment('a1', 'd1', 'p1', 's1', new Date(), 30, AppointmentStatus.PENDING);
      appointments.findById.mockResolvedValue(a);
      await expect(service().complete('a1')).rejects.toMatchObject({ status: 400 });
    });
  });
});
