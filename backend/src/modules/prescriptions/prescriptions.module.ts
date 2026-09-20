import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionController } from './adapters/http/prescription.controller';
import { PrescriptionService } from './application/prescription.service';
import { TypeOrmPrescriptionRepository } from './adapters/persistence/typeorm-prescription.repository';
import { PRESCRIPTION_REPOSITORY } from './prescription.repository.port';
import { PrescriptionOrmEntity } from './adapters/persistence/prescription.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionOrmEntity]),
    AppointmentsModule,
    PatientsModule,
    DoctorsModule,
  ],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    TypeOrmPrescriptionRepository,
    { provide: PRESCRIPTION_REPOSITORY, useExisting: TypeOrmPrescriptionRepository },
  ],
  exports: [PrescriptionService],
})
export class PrescriptionsModule {}
