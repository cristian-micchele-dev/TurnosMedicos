import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './adapters/http/doctor.controller';
import { DoctorService } from './application/doctor.service';
import { TypeOrmDoctorRepository, TypeOrmAvailabilityRepository } from './adapters/persistence/typeorm-doctor.repository';
import { DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY } from './doctor.repository.port';
import { DoctorOrmEntity, AvailabilityOrmEntity } from './adapters/persistence/doctor.entity';
import { SpecialtiesModule } from '../specialties/specialties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorOrmEntity, AvailabilityOrmEntity]),
    SpecialtiesModule,
  ],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    TypeOrmDoctorRepository,
    TypeOrmAvailabilityRepository,
    { provide: DOCTOR_REPOSITORY, useExisting: TypeOrmDoctorRepository },
    { provide: AVAILABILITY_REPOSITORY, useExisting: TypeOrmAvailabilityRepository },
  ],
  exports: [DoctorService, TypeOrmDoctorRepository, TypeOrmAvailabilityRepository, DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY],
})
export class DoctorsModule {}
