import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentController } from './adapters/http/appointment.controller';
import { AppointmentService } from './application/appointment.service';
import { TypeOrmAppointmentRepository } from './adapters/persistence/typeorm-appointment.repository';
import { APPOINTMENT_REPOSITORY } from './appointment.repository.port';
import { AppointmentOrmEntity } from './adapters/persistence/appointment.entity';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentOrmEntity]),
    DoctorsModule,
    PatientsModule,
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    TypeOrmAppointmentRepository,
    { provide: APPOINTMENT_REPOSITORY, useExisting: TypeOrmAppointmentRepository },
  ],
})
export class AppointmentsModule {}
