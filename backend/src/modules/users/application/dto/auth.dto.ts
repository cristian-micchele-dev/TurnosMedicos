import {IsEmail,IsString,MinLength,IsOptional,IsEnum} from 'class-validator'; import {Role} from '../../domain/user';
export class RegisterDto {@IsEmail() email!:string; @IsString() @MinLength(8) password!:string; @IsOptional() @IsString() name?:string; @IsOptional() @IsEnum(Role) role?:Role;}
export class LoginDto {@IsEmail() email!:string; @IsString() password!:string;}
export class ResetPasswordDto {@IsString() token!:string; @IsString() @MinLength(8) password!:string;}
export class ForgotPasswordDto {@IsEmail() email!:string;}
