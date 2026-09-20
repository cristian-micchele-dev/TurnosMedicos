import { PrescriptionService } from './prescription.service';
import { Appointment } from '../../appointments/domain/appointment';
import { AppointmentStatus } from '../../appointments/domain/appointment-status.enum';
import { Doctor } from '../../doctors/domain/doctor';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { ForbiddenError } from '../../../shared/domain/errors';
import { Prescription } from '../domain/prescription';
import { Role } from '../../users/domain/user';

describe('PrescriptionService', () => {
  const doctor = new Doctor('doc-1', 'user-doc-1', 'spec-1', 'LIC-1', null);
  const appointment = new Appointment('a1', 'doc-1', 'p1', 'spec-1', new Date('2026-09-07T10:00:00Z'), 30, AppointmentStatus.COMPLETED);
  const dto = { medications: [{ name: 'Ibuprofeno', dosage: '400mg', frequency: 'cada 8hs', duration: '5 días' }], instructions: 'Con las comidas' };

  const prescriptions: any = { save: jest.fn(async (p: unknown) => p), findById: jest.fn(), findByAppointmentId: jest.fn(), findByPatientId: jest.fn() };
  const appointments: any = { findById: jest.fn().mockResolvedValue(appointment) };
  const doctors: any = { findByUserId: jest.fn().mockResolvedValue(doctor) };
  const access: any = { assertCanRead: jest.fn().mockResolvedValue(undefined) };
  const service = new PrescriptionService(prescriptions, appointments, doctors, access);
  const actor = { sub: 'u-x', role: Role.DOCTOR };

  beforeEach(() => jest.clearAllMocks());

  it('resuelve el perfil de médico a partir del userId y autoriza por doctor.id', async () => {
    const result = await service.create('user-doc-1', 'a1', dto);
    expect(doctors.findByUserId).toHaveBeenCalledWith('user-doc-1');
    expect(result.doctorId).toBe('doc-1');
  });

  it('rechaza si el usuario no tiene perfil de médico', async () => {
    doctors.findByUserId.mockResolvedValueOnce(undefined);
    await expect(service.create('user-sin-perfil', 'a1', dto)).rejects.toBeInstanceOf(DoctorNotFoundError);
  });

  it('rechaza si el turno pertenece a otro médico', async () => {
    doctors.findByUserId.mockResolvedValueOnce(new Doctor('doc-2', 'user-doc-2', 'spec-1', 'LIC-2', null));
    await expect(service.create('user-doc-2', 'a1', dto)).rejects.toBeInstanceOf(ForbiddenError);
  });

  describe('lecturas pasan por la política de acceso a historia clínica', () => {
    const rx = new Prescription('rx1', 'a1', 'doc-1', 'p1', dto.medications, null);

    it('findOne consulta la política con el paciente de la receta', async () => {
      prescriptions.findById.mockResolvedValueOnce(rx);
      await service.findOne('rx1', actor);
      expect(access.assertCanRead).toHaveBeenCalledWith(actor, 'p1');
    });

    it('findByAppointment consulta la política con el paciente del turno', async () => {
      prescriptions.findByAppointmentId.mockResolvedValueOnce([rx]);
      await service.findByAppointment('a1', actor);
      expect(access.assertCanRead).toHaveBeenCalledWith(actor, 'p1');
    });

    it('findByPatient consulta la política y propaga el 403', async () => {
      access.assertCanRead.mockRejectedValueOnce(new ForbiddenError());
      await expect(service.findByPatient('p1', 1, 10, actor)).rejects.toBeInstanceOf(ForbiddenError);
      expect(prescriptions.findByPatientId).not.toHaveBeenCalled();
    });
  });

  it('rechaza si el turno no está completado', async () => {
    appointments.findById.mockResolvedValueOnce(new Appointment('a2', 'doc-1', 'p1', 'spec-1', new Date(), 30, AppointmentStatus.CONFIRMED));
    await expect(service.create('user-doc-1', 'a2', dto)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
