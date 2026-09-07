import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/adapters/http/auth.guards';
import { StatsService } from './stats.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.stats.getStats(req.user.role, req.user.sub);
  }
}
