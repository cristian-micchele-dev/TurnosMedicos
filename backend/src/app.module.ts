import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { HealthController } from './health.controller';
import { UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity } from './modules/users/adapters/persistence/entities';
import { SpecialtyOrmEntity } from './modules/specialties/adapters/persistence/specialty.entity';
import { DoctorOrmEntity, AvailabilityOrmEntity } from './modules/doctors/adapters/persistence/doctor.entity';
import { PatientOrmEntity } from './modules/patients/adapters/persistence/patient.entity';
import { AppointmentOrmEntity } from './modules/appointments/adapters/persistence/appointment.entity';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('databaseUrl'),
        entities: [UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity, SpecialtyOrmEntity, DoctorOrmEntity, AvailabilityOrmEntity, PatientOrmEntity, AppointmentOrmEntity],
        synchronize: false,
      }),
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    SpecialtiesModule,
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
