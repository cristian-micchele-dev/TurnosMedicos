import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMedicalReportDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
