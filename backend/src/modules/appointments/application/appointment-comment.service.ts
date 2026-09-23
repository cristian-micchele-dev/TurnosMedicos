import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppointmentComment } from '../domain/appointment-comment';
import { AppointmentCommentRepository, APPOINTMENT_COMMENT_REPOSITORY } from '../appointment-comment.repository.port';
import { AppointmentService } from './appointment.service';
import { UserRepository } from '../../users/user.repository.port';
import { Actor } from '../../users/domain/actor';
import { Clock, CLOCK } from '../../../shared/application/ports';

@Injectable()
export class AppointmentCommentService {
  constructor(
    @Inject(APPOINTMENT_COMMENT_REPOSITORY) private readonly comments: AppointmentCommentRepository,
    private readonly appointments: AppointmentService,
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * The thread has no access rule of its own: seeing the appointment is the rule.
   * `findOne` already throws 404 if it does not exist and 403 if it is not yours,
   * so a doctor cannot read the coordination about someone else's patient.
   */
  private async assertCanSee(appointmentId: string, actor: Actor): Promise<void> {
    await this.appointments.findOne(appointmentId, actor);
  }

  async add(appointmentId: string, body: string, actor: Actor) {
    await this.assertCanSee(appointmentId, actor);
    const comment = new AppointmentComment(randomUUID(), appointmentId, actor.sub, body, this.clock.now());
    await this.comments.save(comment);
    const [author] = await this.users.findByIds([actor.sub]);
    return comment.toPublic(author && { id: author.id, name: author.name || author.email, role: author.role });
  }

  async list(appointmentId: string, actor: Actor) {
    await this.assertCanSee(appointmentId, actor);
    const thread = await this.comments.findByAppointment(appointmentId);

    // One query for every author in the thread, never one per comment.
    const authorIds = [...new Set(thread.map((c) => c.authorId))];
    const authors = new Map(
      (await this.users.findByIds(authorIds)).map((u) => [u.id, { id: u.id, name: u.name || u.email, role: u.role as string }]),
    );

    return thread.map((c) => c.toPublic(authors.get(c.authorId)));
  }
}
