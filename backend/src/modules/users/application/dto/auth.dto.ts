import {IsBoolean,IsEmail,IsOptional,IsString,MinLength} from 'class-validator';
export class LoginDto {@IsEmail() email!:string; @IsString() password!:string; @IsOptional() @IsBoolean() rememberMe?:boolean;}
export class ResetPasswordDto {@IsString() token!:string; @IsString() @MinLength(8) password!:string;}
export class ForgotPasswordDto {@IsEmail() email!:string;}
export class ChangePasswordDto {@IsString() currentPassword!:string; @IsString() @MinLength(8) newPassword!:string;}
