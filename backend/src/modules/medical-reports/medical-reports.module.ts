import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalReportController } from './adapters/http/medical-report.controller';
import { MedicalReportService } from './application/medical-report.service';
import { TypeOrmMedicalReportRepository } from './adapters/persistence/typeorm-medical-report.repository';
import { MEDICAL_REPORT_REPOSITORY } from './medical-report.repository.port';
import { MedicalReportOrmEntity } from './adapters/persistence/medical-report.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PatientsModule } from '../patients/patients.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalReportOrmEntity]),
    AppointmentsModule,
    PatientsModule,
    DoctorsModule,
  ],
  controllers: [MedicalReportController],
  providers: [
    MedicalReportService,
    TypeOrmMedicalReportRepository,
    { provide: MEDICAL_REPORT_REPOSITORY, useExisting: TypeOrmMedicalReportRepository },
  ],
  exports: [MedicalReportService],
})
export class MedicalReportsModule {}
