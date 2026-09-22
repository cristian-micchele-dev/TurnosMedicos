import { MedicalRecordAccessPolicy } from './medical-record-access.policy';
import { Doctor } from '../../doctors/domain/doctor';
import { Role } from '../../users/domain/user';

describe('MedicalRecordAccessPolicy', () => {
  const appointments: any = { findAll: jest.fn() };
  const doctors: any = { findByUserId: jest.fn() };
  const audit: any = { record: jest.fn() };
  const policy = new MedicalRecordAccessPolicy(appointments, doctors, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    appointments.findAll.mockResolvedValue([[], 0]);
    doctors.findByUserId.mockResolvedValue(new Doctor('d1', 'u-doc', 's1', 'MP-1'));
  });

  it('ADMIN accede a cualquier historia clínica sin consultar repositorios', async () => {
    await expect(policy.assertCanRead({ sub: 'u-admin', role: Role.ADMIN }, 'p-any')).resolves.toBeUndefined();
    expect(appointments.findAll).not.toHaveBeenCalled();
  });

  it('SECRETARY nunca accede a una historia clínica, ni siquiera de un paciente que ella agendó', async () => {
    await expect(policy.assertCanRead({ sub: 'u-sec', role: Role.SECRETARY }, 'p1')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(doctors.findByUserId).not.toHaveBeenCalled();
    expect(appointments.findAll).not.toHaveBeenCalled();
  });

  it('DOCTOR accede si tiene al menos un turno con el paciente', async () => {
    appointments.findAll.mockResolvedValue([[{}], 1]);
    await expect(policy.assertCanRead({ sub: 'u-doc', role: Role.DOCTOR }, 'p1')).resolves.toBeUndefined();
    expect(appointments.findAll).toHaveBeenCalledWith({ doctorId: 'd1', patientId: 'p1', take: 1 });
  });

  it('DOCTOR sin relación con el paciente recibe 403', async () => {
    await expect(policy.assertCanRead({ sub: 'u-doc', role: Role.DOCTOR }, 'p1')).rejects.toMatchObject({ status: 403 });
  });

  it('DOCTOR sin perfil recibe 404', async () => {
    doctors.findByUserId.mockResolvedValue(undefined);
    await expect(policy.assertCanRead({ sub: 'u-x', role: Role.DOCTOR }, 'p1')).rejects.toMatchObject({ status: 404 });
  });

  describe('deja rastro de cada acceso a una historia clínica', () => {
    it('registra el acceso concedido con el paciente y quién lo miró', async () => {
      appointments.findAll.mockResolvedValue([[{}], 1]);
      const actor = { sub: 'u-doc', role: Role.DOCTOR };
      await policy.assertCanRead(actor, 'p1');
      expect(audit.record).toHaveBeenCalledWith(actor, 'RECORD_ACCESS_GRANTED', 'patient', 'p1');
    });

    it('registra también el intento rechazado, que es el que más interesa', async () => {
      appointments.findAll.mockResolvedValue([[], 0]);
      const actor = { sub: 'u-doc', role: Role.DOCTOR };
      await expect(policy.assertCanRead(actor, 'p9')).rejects.toMatchObject({ status: 403 });
      expect(audit.record).toHaveBeenCalledWith(actor, 'RECORD_ACCESS_DENIED', 'patient', 'p9');
    });

    it('el paso libre del ADMIN no es una excepción al registro', async () => {
      const actor = { sub: 'u-admin', role: Role.ADMIN };
      await policy.assertCanRead(actor, 'p1');
      expect(audit.record).toHaveBeenCalledWith(actor, 'RECORD_ACCESS_GRANTED', 'patient', 'p1');
    });
  });
});
