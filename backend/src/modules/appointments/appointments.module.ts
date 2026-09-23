import { AppointmentCommentService } from './application/appointment-comment.service';
import { TypeOrmAppointmentCommentRepository } from './adapters/persistence/typeorm-appointment-comment.repository';
import { APPOINTMENT_COMMENT_REPOSITORY } from './appointment-comment.repository.port';
import { AppointmentCommentOrmEntity } from './adapters/persistence/appointment-comment.entity';
import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentController } from './adapters/http/appointment.controller';
import { AppointmentService } from './application/appointment.service';
import { MedicalRecordAccessPolicy } from './application/medical-record-access.policy';
import { TypeOrmAppointmentRepository } from './adapters/persistence/typeorm-appointment.repository';
import { APPOINTMENT_REPOSITORY } from './appointment.repository.port';
import { AppointmentOrmEntity } from './adapters/persistence/appointment.entity';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([AppointmentOrmEntity, AppointmentCommentOrmEntity]),
    DoctorsModule,
    PatientsModule,
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentCommentService,
    TypeOrmAppointmentCommentRepository,
    { provide: APPOINTMENT_COMMENT_REPOSITORY, useExisting: TypeOrmAppointmentCommentRepository },
    MedicalRecordAccessPolicy,
    TypeOrmAppointmentRepository,
    { provide: APPOINTMENT_REPOSITORY, useExisting: TypeOrmAppointmentRepository },
  ],
  exports: [AppointmentService, MedicalRecordAccessPolicy, TypeOrmAppointmentRepository, APPOINTMENT_REPOSITORY],
})
export class AppointmentsModule {}
