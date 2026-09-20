import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
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

export class CompleteAppointmentDto {
  @IsOptional() @IsString() @MaxLength(2000) diagnosis?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString() dateTime!: string;
}

export class QueryAppointmentsDto {
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsUUID() specialtyId?: string;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
