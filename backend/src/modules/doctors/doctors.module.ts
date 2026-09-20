import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './adapters/http/doctor.controller';
import { DoctorService } from './application/doctor.service';
import { TypeOrmDoctorRepository, TypeOrmAvailabilityRepository, TypeOrmScheduleBlockRepository } from './adapters/persistence/typeorm-doctor.repository';
import { DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY, SCHEDULE_BLOCK_REPOSITORY } from './doctor.repository.port';
import { DoctorOrmEntity, AvailabilityOrmEntity, ScheduleBlockOrmEntity } from './adapters/persistence/doctor.entity';
import { SpecialtiesModule } from '../specialties/specialties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorOrmEntity, AvailabilityOrmEntity, ScheduleBlockOrmEntity]),
    SpecialtiesModule,
  ],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    TypeOrmDoctorRepository,
    TypeOrmAvailabilityRepository,
    TypeOrmScheduleBlockRepository,
    { provide: DOCTOR_REPOSITORY, useExisting: TypeOrmDoctorRepository },
    { provide: AVAILABILITY_REPOSITORY, useExisting: TypeOrmAvailabilityRepository },
    { provide: SCHEDULE_BLOCK_REPOSITORY, useExisting: TypeOrmScheduleBlockRepository },
  ],
  exports: [DoctorService, TypeOrmDoctorRepository, TypeOrmAvailabilityRepository, TypeOrmScheduleBlockRepository, DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY, SCHEDULE_BLOCK_REPOSITORY],
})
export class DoctorsModule {}
