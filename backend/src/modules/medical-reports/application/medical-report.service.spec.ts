jest.mock('fs/promises', () => ({ writeFile: jest.fn().mockResolvedValue(undefined) }));
jest.mock('fs', () => ({ mkdirSync: jest.fn(), unlinkSync: jest.fn() }));

import { MedicalReportService } from './medical-report.service';
import { MedicalReport } from '../domain/medical-report';
import { Appointment } from '../../appointments/domain/appointment';
import { AppointmentStatus } from '../../appointments/domain/appointment-status.enum';
import { Doctor } from '../../doctors/domain/doctor';
import { DoctorNotFoundError } from '../../doctors/domain/doctor-not-found.exception';
import { ForbiddenError } from '../../../shared/domain/errors';
import { Role } from '../../users/domain/user';

describe('MedicalReportService', () => {
  const doctor = new Doctor('doc-1', 'user-doc-1', 'spec-1', 'LIC-1', null);
  const otherDoctor = new Doctor('doc-2', 'user-doc-2', 'spec-1', 'LIC-2', null);
  const appointment = new Appointment('a1', 'doc-1', 'p1', 'spec-1', new Date('2026-09-07T10:00:00Z'), 30, AppointmentStatus.COMPLETED);
  const file = { originalname: 'informe.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') } as Express.Multer.File;
  const dto = { title: 'Informe' };

  const reports: any = { save: jest.fn(async (r: unknown) => r), findById: jest.fn(), delete: jest.fn(), findByAppointmentId: jest.fn(), findByPatientId: jest.fn() };
  const appointments: any = { findById: jest.fn().mockResolvedValue(appointment) };
  const patients: any = { findById: jest.fn().mockResolvedValue({ id: 'p1', userId: 'user-p1' }) };
  const doctors: any = { findByUserId: jest.fn().mockResolvedValue(doctor) };
  const access: any = { assertCanRead: jest.fn().mockResolvedValue(undefined) };
  const service = new MedicalReportService(reports, appointments, patients, doctors, access);
  const actor = { sub: 'u-x', role: Role.DOCTOR };

  beforeEach(() => jest.clearAllMocks());

  describe('upload', () => {
    it('resuelve el médico por userId y guarda el informe con doctor.id', async () => {
      const result = await service.upload('user-doc-1', 'a1', dto, file);
      expect(doctors.findByUserId).toHaveBeenCalledWith('user-doc-1');
      expect(result.doctorId).toBe('doc-1');
    });

    it('rechaza si el usuario no tiene perfil de médico', async () => {
      doctors.findByUserId.mockResolvedValueOnce(undefined);
      await expect(service.upload('user-x', 'a1', dto, file)).rejects.toBeInstanceOf(DoctorNotFoundError);
    });

    it('rechaza si el turno es de otro médico', async () => {
      doctors.findByUserId.mockResolvedValueOnce(otherDoctor);
      await expect(service.upload('user-doc-2', 'a1', dto, file)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('uploadForPatient', () => {
    it('guarda el informe con doctor.id, no con el userId', async () => {
      const result = await service.uploadForPatient('user-doc-1', 'p1', dto, file);
      expect(result.doctorId).toBe('doc-1');
    });
  });

  describe('lecturas pasan por la política de acceso a historia clínica', () => {
    const report = new MedicalReport('r1', 'a1', 'doc-1', 'p1', 'Informe', null, 'f.pdf', 'informe.pdf', 'application/pdf', 10);

    it('findOne y getFilePath consultan la política con el paciente del informe', async () => {
      reports.findById.mockResolvedValue(report);
      await service.findOne('r1', actor);
      await service.getFilePath('r1', actor);
      expect(access.assertCanRead).toHaveBeenCalledTimes(2);
      expect(access.assertCanRead).toHaveBeenCalledWith(actor, 'p1');
    });

    it('findByAppointment consulta la política con el paciente del turno', async () => {
      reports.findByAppointmentId.mockResolvedValueOnce([report]);
      await service.findByAppointment('a1', actor);
      expect(access.assertCanRead).toHaveBeenCalledWith(actor, 'p1');
    });

    it('findByPatient consulta la política y propaga el 403', async () => {
      access.assertCanRead.mockRejectedValueOnce(new ForbiddenError());
      await expect(service.findByPatient('p1', 1, 10, actor)).rejects.toBeInstanceOf(ForbiddenError);
      expect(reports.findByPatientId).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const report = new MedicalReport('r1', 'a1', 'doc-1', 'p1', 'Informe', null, 'f.pdf', 'informe.pdf', 'application/pdf', 10);

    it('permite borrar al médico dueño del informe', async () => {
      reports.findById.mockResolvedValueOnce(report);
      await service.delete('r1', 'user-doc-1');
      expect(reports.delete).toHaveBeenCalledWith('r1');
    });

    it('rechaza borrar un informe de otro médico', async () => {
      reports.findById.mockResolvedValueOnce(report);
      doctors.findByUserId.mockResolvedValueOnce(otherDoctor);
      await expect(service.delete('r1', 'user-doc-2')).rejects.toBeInstanceOf(ForbiddenError);
      expect(reports.delete).not.toHaveBeenCalled();
    });
  });
});
