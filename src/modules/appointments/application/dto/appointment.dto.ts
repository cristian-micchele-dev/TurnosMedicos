import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AppointmentStatus } from '../../domain/appointment-status.enum';

export class CreateAppointmentDto {
  @IsUUID() doctorId!: string;
  @IsUUID() patientId!: string;
  @IsDateString() dateTime!: string;
  @IsOptional() @IsInt() @Min(10) @Max(120) durationMinutes?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CancelAppointmentDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class QueryAppointmentsDto {
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsUUID() specialtyId?: string;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
