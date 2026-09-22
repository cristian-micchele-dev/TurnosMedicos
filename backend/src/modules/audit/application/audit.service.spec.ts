import { AuditService } from './audit.service';
import { AuditAction } from '../domain/audit-entry';
import { Role } from '../../users/domain/user';

describe('AuditService', () => {
  const entries: any = { save: jest.fn(), findAll: jest.fn() };
  const clock = { now: () => new Date('2026-09-22T12:00:00.000Z') };
  const service = () => new AuditService(entries, clock as any);
  const actor = { sub: 'u-1', role: Role.DOCTOR };

  beforeEach(() => {
    jest.clearAllMocks();
    entries.save.mockResolvedValue(undefined);
    entries.findAll.mockResolvedValue([[], 0]);
  });

  it('registra quién, qué, sobre quién y cuándo', async () => {
    await service().record(actor, AuditAction.RECORD_ACCESS_GRANTED, 'patient', 'p-1');
    expect(entries.save).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'u-1',
      actorRole: Role.DOCTOR,
      action: AuditAction.RECORD_ACCESS_GRANTED,
      targetType: 'patient',
      targetId: 'p-1',
      occurredAt: new Date('2026-09-22T12:00:00.000Z'),
    }));
  });

  it('si el registro falla, la operación auditada sigue: un log caído no puede tirar una consulta médica', async () => {
    entries.save.mockRejectedValue(new Error('base caída'));
    await expect(service().record(actor, AuditAction.APPOINTMENT_CANCELLED, 'appointment', 'a-1')).resolves.toBeUndefined();
  });

  it('nunca guarda contenido clínico ni credenciales, aunque se lo pasen', async () => {
    await service().record(actor, AuditAction.RECORD_ACCESS_GRANTED, 'patient', 'p-1', {
      reason: 'control anual',
      diagnosis: 'Hipertensión arterial',
      password: 'la-clave-del-doctor',
      newPassword: 'otra',
      token: 'abc',
    });
    const saved = entries.save.mock.calls[0][0];
    expect(saved.metadata).toEqual({ reason: 'control anual' });
  });

  it('recorta un metadato largo en vez de guardar un texto libre entero', async () => {
    await service().record(actor, AuditAction.APPOINTMENT_CANCELLED, 'appointment', 'a-1', { reason: 'x'.repeat(500) });
    expect((entries.save.mock.calls[0][0].metadata.reason as string).length).toBeLessThanOrEqual(200);
  });
});
