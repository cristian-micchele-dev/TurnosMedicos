import {IsEmail,IsString,MinLength,IsOptional} from 'class-validator';
export class RegisterDto {@IsEmail() email!:string; @IsString() @MinLength(8) password!:string; @IsOptional() @IsString() name?:string;}
export class LoginDto {@IsEmail() email!:string; @IsString() password!:string;}
export class ResetPasswordDto {@IsString() token!:string; @IsString() @MinLength(8) password!:string;}
export class ForgotPasswordDto {@IsEmail() email!:string;}
