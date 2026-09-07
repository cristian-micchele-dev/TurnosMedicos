import { IsEnum } from 'class-validator';
import { Role } from '../../domain/user';

export class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}
