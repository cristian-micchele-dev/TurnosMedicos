import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './adapters/http/patient.controller';
import { PatientService } from './application/patient.service';
import { TypeOrmPatientRepository } from './adapters/persistence/typeorm-patient.repository';
import { PATIENT_REPOSITORY } from './patient.repository.port';
import { PatientOrmEntity } from './adapters/persistence/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientOrmEntity]),
  ],
  controllers: [PatientController],
  providers: [
    PatientService,
    TypeOrmPatientRepository,
    { provide: PATIENT_REPOSITORY, useExisting: TypeOrmPatientRepository },
  ],
  exports: [PatientService, TypeOrmPatientRepository, PATIENT_REPOSITORY],
})
export class PatientsModule {}
