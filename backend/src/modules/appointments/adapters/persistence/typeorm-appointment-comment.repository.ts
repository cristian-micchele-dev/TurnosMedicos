import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentCommentRepository } from '../../appointment-comment.repository.port';
import { AppointmentComment } from '../../domain/appointment-comment';
import { AppointmentCommentOrmEntity } from './appointment-comment.entity';

@Injectable()
export class TypeOrmAppointmentCommentRepository implements AppointmentCommentRepository {
  constructor(@InjectRepository(AppointmentCommentOrmEntity) private readonly repo: Repository<AppointmentCommentOrmEntity>) {}

  async save(c: AppointmentComment): Promise<void> {
    await this.repo.insert({ id: c.id, appointmentId: c.appointmentId, authorId: c.authorId, body: c.body, createdAt: c.createdAt });
  }

  async findByAppointment(appointmentId: string): Promise<AppointmentComment[]> {
    const rows = await this.repo.find({ where: { appointmentId }, order: { createdAt: 'ASC' } });
    return rows.map((r) => new AppointmentComment(r.id, r.appointmentId, r.authorId, r.body, r.createdAt));
  }
}
