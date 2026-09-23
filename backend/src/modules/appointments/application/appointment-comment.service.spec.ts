import { AppointmentCommentService } from './appointment-comment.service';
import { AppointmentComment } from '../domain/appointment-comment';
import { ForbiddenError } from '../../../shared/domain/errors';
import { Role, User } from '../../users/domain/user';

describe('AppointmentCommentService', () => {
  const comments: any = { save: jest.fn(), findByAppointment: jest.fn() };
  const appointments: any = { findOne: jest.fn() };
  const users: any = { findByIds: jest.fn() };
  const clock = { now: () => new Date('2026-09-23T10:00:00.000Z') };
  const service = () => new AppointmentCommentService(comments, appointments, users, clock as any);

  const secretary = { sub: 'u-sec', role: Role.SECRETARY };

  beforeEach(() => {
    jest.clearAllMocks();
    appointments.findOne.mockResolvedValue({ id: 'a1' });
    comments.findByAppointment.mockResolvedValue([]);
    users.findByIds.mockResolvedValue([]);
  });

  it('para escribir hay que poder ver el turno: la regla es la del turno, no una nueva', async () => {
    appointments.findOne.mockRejectedValue(new ForbiddenError());
    await expect(service().add('a9', 'no debería entrar', secretary)).rejects.toMatchObject({ status: 403 });
    expect(comments.save).not.toHaveBeenCalled();
  });

  it('leer el hilo pasa por el mismo control', async () => {
    appointments.findOne.mockRejectedValue(new ForbiddenError());
    await expect(service().list('a9', secretary)).rejects.toMatchObject({ status: 403 });
  });

  it('guarda el comentario con su autor y el momento', async () => {
    await service().add('a1', '¿Lo confirmo?', secretary);
    expect(comments.save).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: 'a1',
      authorId: 'u-sec',
      body: '¿Lo confirmo?',
      createdAt: new Date('2026-09-23T10:00:00.000Z'),
    }));
  });

  it('rechaza un comentario vacío o de puros espacios', async () => {
    await expect(service().add('a1', '   ', secretary)).rejects.toMatchObject({ status: 400, code: 'EMPTY_COMMENT' });
    expect(comments.save).not.toHaveBeenCalled();
  });

  it('recorta un comentario larguísimo en vez de guardar un informe entero', async () => {
    await service().add('a1', 'x'.repeat(900), secretary);
    expect(comments.save.mock.calls[0][0].body).toHaveLength(500);
  });

  it('el hilo llega con el nombre del autor resuelto en una sola consulta', async () => {
    comments.findByAppointment.mockResolvedValue([
      new AppointmentComment('c1', 'a1', 'u-sec', '¿Lo confirmo?'),
      new AppointmentComment('c2', 'a1', 'u-doc', 'Dale'),
      new AppointmentComment('c3', 'a1', 'u-sec', 'Listo'),
    ]);
    users.findByIds.mockResolvedValue([
      new User('u-sec', 'sec@h.com', 'Marta', 'hash', Role.SECRETARY),
      new User('u-doc', 'doc@h.com', 'Laura', 'hash', Role.DOCTOR),
    ]);
    const thread = await service().list('a1', secretary);
    expect(users.findByIds).toHaveBeenCalledTimes(1);
    expect(users.findByIds).toHaveBeenCalledWith(['u-sec', 'u-doc']);
    expect(thread.map((c) => c.author.name)).toEqual(['Marta', 'Laura', 'Marta']);
  });

  it('si el autor fue dado de baja el comentario sigue legible', async () => {
    comments.findByAppointment.mockResolvedValue([new AppointmentComment('c1', 'a1', 'u-borrado', 'Algo')]);
    users.findByIds.mockResolvedValue([]);
    const [comment] = await service().list('a1', secretary);
    expect(comment.body).toBe('Algo');
    expect(comment.author.name).toMatch(/baja/i);
  });
});
