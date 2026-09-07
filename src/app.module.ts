import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { HealthController } from './health.controller';
import { AuthController } from './modules/auth/adapters/http/auth.controller';
import { JwtAuthGuard, RolesGuard } from './modules/auth/adapters/http/auth.guards';
import { AuthService } from './modules/auth/application/auth.service';
import { DatabaseModule } from './database/typeorm.module';
import { UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity } from './modules/users/adapters/persistence/entities';
import { TypeOrmUserRepository } from './modules/users/adapters/persistence/typeorm-user.repository';
import { TypeOrmSessionRepository, TypeOrmResetRepository } from './modules/auth/adapters/persistence/typeorm-auth.repository';
import { NoopMailer } from './modules/auth/adapters/mail/noop.mailer';
import { Argon2Hasher, JwtTokenService } from './shared/infra/crypto/services';
import { SystemClock } from './shared/infra/time/system-clock';
import { HASHER, TOKEN_SERVICE, CLOCK } from './shared/application/ports';
import { SESSION_REPOSITORY, RESET_REPOSITORY, MAILER } from './modules/auth/ports/repositories';
import { SpecialtyController } from './modules/specialties/adapters/http/specialty.controller';
import { SpecialtyService } from './modules/specialties/application/specialty.service';
import { TypeOrmSpecialtyRepository } from './modules/specialties/adapters/persistence/typeorm-specialty.repository';
import { SPECIALTY_REPOSITORY } from './modules/specialties/specialty.repository.port';
import { SpecialtyOrmEntity } from './modules/specialties/adapters/persistence/specialty.entity';
import { DoctorController } from './modules/doctors/adapters/http/doctor.controller';
import { DoctorService } from './modules/doctors/application/doctor.service';
import { TypeOrmDoctorRepository, TypeOrmAvailabilityRepository } from './modules/doctors/adapters/persistence/typeorm-doctor.repository';
import { DOCTOR_REPOSITORY, AVAILABILITY_REPOSITORY } from './modules/doctors/doctor.repository.port';
import { DoctorOrmEntity, AvailabilityOrmEntity } from './modules/doctors/adapters/persistence/doctor.entity';
import { PatientController } from './modules/patients/adapters/http/patient.controller';
import { PatientService } from './modules/patients/application/patient.service';
import { TypeOrmPatientRepository } from './modules/patients/adapters/persistence/typeorm-patient.repository';
import { PATIENT_REPOSITORY } from './modules/patients/patient.repository.port';
import { PatientOrmEntity } from './modules/patients/adapters/persistence/patient.entity';
import { AppointmentController } from './modules/appointments/adapters/http/appointment.controller';
import { AppointmentService } from './modules/appointments/application/appointment.service';
import { TypeOrmAppointmentRepository } from './modules/appointments/adapters/persistence/typeorm-appointment.repository';
import { APPOINTMENT_REPOSITORY } from './modules/appointments/appointment.repository.port';
import { AppointmentOrmEntity } from './modules/appointments/adapters/persistence/appointment.entity';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }), TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (config: ConfigService) => ({ type: 'postgres', url: config.getOrThrow('databaseUrl'), entities: [UserOrmEntity, AuthSessionOrmEntity, ResetTokenOrmEntity, SpecialtyOrmEntity, DoctorOrmEntity, AvailabilityOrmEntity, PatientOrmEntity, AppointmentOrmEntity], synchronize: false }) }), DatabaseModule],
  controllers: [HealthController, AuthController, SpecialtyController, DoctorController, PatientController, AppointmentController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, Argon2Hasher, JwtTokenService, SystemClock, TypeOrmUserRepository, TypeOrmSessionRepository, TypeOrmResetRepository, NoopMailer,
    { provide: 'USER_REPOSITORY', useExisting: TypeOrmUserRepository }, { provide: HASHER, useExisting: Argon2Hasher }, { provide: TOKEN_SERVICE, useExisting: JwtTokenService }, { provide: CLOCK, useExisting: SystemClock }, { provide: SESSION_REPOSITORY, useExisting: TypeOrmSessionRepository }, { provide: RESET_REPOSITORY, useExisting: TypeOrmResetRepository }, { provide: MAILER, useExisting: NoopMailer }, SpecialtyService, TypeOrmSpecialtyRepository, { provide: SPECIALTY_REPOSITORY, useExisting: TypeOrmSpecialtyRepository }, DoctorService, TypeOrmDoctorRepository, TypeOrmAvailabilityRepository, { provide: DOCTOR_REPOSITORY, useExisting: TypeOrmDoctorRepository }, { provide: AVAILABILITY_REPOSITORY, useExisting: TypeOrmAvailabilityRepository }, PatientService, TypeOrmPatientRepository, { provide: PATIENT_REPOSITORY, useExisting: TypeOrmPatientRepository }, AppointmentService, TypeOrmAppointmentRepository, { provide: APPOINTMENT_REPOSITORY, useExisting: TypeOrmAppointmentRepository }],
})
export class AppModule {}
