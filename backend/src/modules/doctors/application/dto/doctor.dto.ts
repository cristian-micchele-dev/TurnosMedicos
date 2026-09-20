import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @IsUUID() userId!: string;
  @IsUUID() specialtyId!: string;
  @IsString() @MinLength(3) @MaxLength(50) licenseNumber!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class UpdateDoctorDto {
  @IsOptional() @IsUUID() specialtyId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(50) licenseNumber?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AvailabilitySlotDto {
  @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime debe tener formato HH:mm' }) startTime!: string;
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime debe tener formato HH:mm' }) endTime!: string;
  @IsOptional() @IsInt() @Min(10) @Max(120) slotDuration?: number;
}

export class SetAvailabilityDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

export class CreateScheduleBlockDto {
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
}
