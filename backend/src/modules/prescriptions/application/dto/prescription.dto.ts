import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MedicationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  dosage!: string;

  @IsString()
  @MinLength(1)
  frequency!: string;

  @IsString()
  @MinLength(1)
  duration!: string;
}

export class CreatePrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications!: MedicationDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class QueryPrescriptionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
