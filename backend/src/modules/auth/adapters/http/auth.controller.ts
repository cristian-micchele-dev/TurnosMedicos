import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from '../../application/auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, ResetPasswordDto } from '../../../users/application/dto/auth.dto';
import { JwtAuthGuard } from './auth.guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  // Session cookie by default; a remembered login gets an explicit lifetime so it survives closing the browser.
  private cookie(response: Response, token: string, persistUntil?: Date) {
    const maxAge = persistUntil ? { maxAge: Math.max(0, persistUntil.getTime() - Date.now()) } : {};
    const secure = process.env.NODE_ENV === 'production';
    const path = '/api/v1/auth';
    response.cookie(process.env.REFRESH_COOKIE_NAME ?? 'refresh_token', token, { httpOnly: true, secure, sameSite: 'lax', path, ...maxAge });
    response.cookie(process.env.CSRF_COOKIE_NAME ?? 'csrf_token', randomBytes(24).toString('hex'), { secure, sameSite: 'lax', path, ...maxAge });
  }
  @Throttle({ default: { ttl: 60000, limit: 5 } }) @Post('login') async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const result = await this.service.login(dto); this.cookie(response, result.refreshToken, result.persistent ? result.expiresAt : undefined); return { accessToken: result.accessToken }; }
  @Post('refresh') async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const csrf = request.headers['x-csrf-token'];
    if (!csrf || csrf !== request.cookies?.[process.env.CSRF_COOKIE_NAME ?? 'csrf_token']) throw new UnauthorizedException();
    const result = await this.service.refresh(request.cookies?.[process.env.REFRESH_COOKIE_NAME ?? 'refresh_token']); this.cookie(response, result.refreshToken, result.persistent ? result.expiresAt : undefined); return { accessToken: result.accessToken };
  }
  @Post('logout') async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { await this.service.logout(request.cookies?.[process.env.REFRESH_COOKIE_NAME ?? 'refresh_token']); const options = { path: '/api/v1/auth' }; response.clearCookie(process.env.REFRESH_COOKIE_NAME ?? 'refresh_token', options); response.clearCookie(process.env.CSRF_COOKIE_NAME ?? 'csrf_token', options); return { message: 'Sesión cerrada' }; }
  @UseGuards(JwtAuthGuard) @Get('me') me(@Req() request: Request) { return this.service.me((request as any).user.sub); }
  @UseGuards(JwtAuthGuard) @Post('change-password') async changePassword(@Req() request: Request, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) response: Response) { const result = await this.service.changePassword((request as any).user.sub, dto); this.cookie(response, result.refreshToken, result.persistent ? result.expiresAt : undefined); return { accessToken: result.accessToken }; }
  @Throttle({ default: { ttl: 60000, limit: 3 } }) @Post('forgot-password') forgot(@Body() dto: ForgotPasswordDto) { return this.service.forgot(dto.email); }
  @Throttle({ default: { ttl: 60000, limit: 5 } }) @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.service.reset(dto); }
}
