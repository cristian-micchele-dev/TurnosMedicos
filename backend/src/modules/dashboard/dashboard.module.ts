import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { ChartsService } from './charts.service';
import { AppointmentOrmEntity } from '../appointments/adapters/persistence/appointment.entity';
import { SpecialtyOrmEntity } from '../specialties/adapters/persistence/specialty.entity';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentOrmEntity, SpecialtyOrmEntity]), PatientsModule],
  controllers: [StatsController],
  providers: [StatsService, ChartsService],
})
export class DashboardModule {}
