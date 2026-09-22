import { NotificationService } from './notification.service';
import { Notification, NotificationType } from '../domain/notification';

describe('NotificationService', () => {
  const repo: any = { save: jest.fn(), findByUser: jest.fn(), findById: jest.fn(), update: jest.fn(), markAllRead: jest.fn(), countUnread: jest.fn() };
  const gateway: any = { notifyUser: jest.fn() };
  const clock = { now: () => new Date('2026-09-22T18:00:00.000Z') };
  const service = () => new NotificationService(repo, clock as any, gateway);

  beforeEach(() => {
    jest.clearAllMocks();
    repo.save.mockResolvedValue(undefined);
    repo.findByUser.mockResolvedValue([[], 0]);
    repo.countUnread.mockResolvedValue(0);
  });

  it('guarda primero y emite después: si nadie escucha, la notificación espera', async () => {
    await service().notify('u-doc', NotificationType.APPOINTMENT_CREATED, 'Emanuel — mañana 09:30', 'a-1');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u-doc',
      type: NotificationType.APPOINTMENT_CREATED,
      message: 'Emanuel — mañana 09:30',
      appointmentId: 'a-1',
      readAt: null,
    }));
    expect(gateway.notifyUser).toHaveBeenCalledWith('u-doc', 'notification', expect.objectContaining({ message: 'Emanuel — mañana 09:30' }));
  });

  it('si el socket falla la notificación ya está guardada: el aviso en vivo es un extra, no el canal', async () => {
    gateway.notifyUser.mockImplementation(() => { throw new Error('sin conexión'); });
    await expect(service().notify('u-doc', NotificationType.APPOINTMENT_CANCELLED, 'Turno cancelado')).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalled();
  });

  it('funciona sin gateway: en los tests y en un worker no hay websocket', async () => {
    const offline = new NotificationService(repo, clock as any);
    await expect(offline.notify('u-doc', NotificationType.APPOINTMENT_CREATED, 'x')).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalled();
  });

  it('marcar como leída solo funciona sobre las propias', async () => {
    repo.findById.mockResolvedValue(new Notification('n1', 'u-otro', NotificationType.APPOINTMENT_CREATED, 'x'));
    await expect(service().markRead('n1', 'u-doc')).rejects.toMatchObject({ status: 403 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('marcar como leída es idempotente: no pisa la fecha de la primera lectura', async () => {
    const already = new Notification('n1', 'u-doc', NotificationType.APPOINTMENT_CREATED, 'x', null, new Date('2026-09-01T10:00:00.000Z'));
    repo.findById.mockResolvedValue(already);
    await service().markRead('n1', 'u-doc');
    expect(already.readAt).toEqual(new Date('2026-09-01T10:00:00.000Z'));
  });

  it('la bandeja devuelve las propias y cuántas sin leer', async () => {
    repo.findByUser.mockResolvedValue([[new Notification('n1', 'u-doc', NotificationType.APPOINTMENT_CREATED, 'x')], 1]);
    repo.countUnread.mockResolvedValue(1);
    const inbox = await service().inbox('u-doc', {});
    expect(repo.findByUser).toHaveBeenCalledWith('u-doc', expect.objectContaining({ skip: 0, take: 20 }));
    expect(inbox.unread).toBe(1);
    expect(inbox.data[0]).toMatchObject({ id: 'n1', read: false });
  });
});
