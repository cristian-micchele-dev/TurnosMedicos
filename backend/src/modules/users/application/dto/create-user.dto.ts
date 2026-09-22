import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { Role } from '../../domain/user';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(Role)
  role!: Role;
}
