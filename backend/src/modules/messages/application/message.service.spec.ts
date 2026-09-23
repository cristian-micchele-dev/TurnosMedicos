import { MessageService } from './message.service';
import { Message } from '../domain/message';
import { Role, User } from '../../users/domain/user';

describe('MessageService', () => {
  const messages: any = { save: jest.fn(), findThread: jest.fn(), listConversations: jest.fn(), markThreadRead: jest.fn(), countUnread: jest.fn() };
  const users: any = { findById: jest.fn(), findByIds: jest.fn() };
  const gateway: any = { notifyUser: jest.fn() };
  const clock = { now: () => new Date('2026-09-23T10:00:00.000Z') };
  const service = () => new MessageService(messages, users, clock as any, gateway);

  const marta = { sub: 'u-sec', role: Role.SECRETARY };
  const laura = new User('u-doc', 'laura@h.com', 'Laura Gómez', 'hash', Role.DOCTOR);

  beforeEach(() => {
    jest.clearAllMocks();
    messages.findThread.mockResolvedValue([[], 0]);
    messages.listConversations.mockResolvedValue([]);
    messages.countUnread.mockResolvedValue(0);
    users.findById.mockResolvedValue(laura);
    users.findByIds.mockResolvedValue([laura]);
  });

  it('guarda el mensaje y lo empuja a quien lo recibe', async () => {
    await service().send(marta, 'u-doc', 'Me voy antes hoy');
    expect(messages.save).toHaveBeenCalledWith(expect.objectContaining({
      senderId: 'u-sec', recipientId: 'u-doc', body: 'Me voy antes hoy', readAt: null,
    }));
    expect(gateway.notifyUser).toHaveBeenCalledWith('u-doc', 'message', expect.objectContaining({ body: 'Me voy antes hoy' }));
  });

  it('si el socket falla el mensaje ya está guardado', async () => {
    gateway.notifyUser.mockImplementation(() => { throw new Error('sin conexión'); });
    await expect(service().send(marta, 'u-doc', 'hola')).resolves.toBeDefined();
    expect(messages.save).toHaveBeenCalled();
  });

  it('no se puede escribir a alguien que no existe', async () => {
    users.findById.mockResolvedValue(undefined);
    await expect(service().send(marta, 'u-fantasma', 'hola')).rejects.toMatchObject({ status: 400, code: 'RECIPIENT_NOT_AVAILABLE' });
    expect(messages.save).not.toHaveBeenCalled();
  });

  it('no se puede escribir a una cuenta dada de baja', async () => {
    users.findById.mockResolvedValue(new User('u-doc', 'x@h.com', 'Baja', 'hash', Role.DOCTOR, false));
    await expect(service().send(marta, 'u-doc', 'hola')).rejects.toMatchObject({ code: 'RECIPIENT_NOT_AVAILABLE' });
  });

  it('no se puede escribir a uno mismo', async () => {
    users.findById.mockResolvedValue(new User('u-sec', 'sec@h.com', 'Marta', 'hash', Role.SECRETARY));
    await expect(service().send(marta, 'u-sec', 'hola')).rejects.toMatchObject({ code: 'SELF_MESSAGE' });
  });

  it('abrir la conversación marca como leído lo que me mandaron, no lo que mandé', async () => {
    await service().thread(marta, 'u-doc');
    expect(messages.markThreadRead).toHaveBeenCalledWith('u-sec', 'u-doc', new Date('2026-09-23T10:00:00.000Z'));
  });

  it('la lista de conversaciones llega con el nombre y el rol de cada persona', async () => {
    messages.listConversations.mockResolvedValue([
      { counterpartId: 'u-doc', lastMessage: new Message('m1', 'u-doc', 'u-sec', 'Dale'), unread: 2 },
    ]);
    const list = await service().conversations(marta);
    expect(list[0]).toMatchObject({
      counterpart: { id: 'u-doc', name: 'Laura Gómez', role: Role.DOCTOR },
      unread: 2,
    });
    expect(list[0].lastMessage.body).toBe('Dale');
  });

  it('los destinatarios posibles son el resto del personal activo, nunca uno mismo', async () => {
    users.findByIds.mockResolvedValue([]);
    const all = [
      new User('u-sec', 'sec@h.com', 'Marta', 'hash', Role.SECRETARY),
      laura,
      new User('u-off', 'off@h.com', 'De baja', 'hash', Role.DOCTOR, false),
    ];
    const contacts = service().contactsFrom(all, 'u-sec');
    expect(contacts.map((c) => c.id)).toEqual(['u-doc']);
  });
});
