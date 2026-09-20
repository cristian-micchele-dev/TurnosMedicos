import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/adapters/http/auth.guards';
import { Role } from '../users/domain/user';
import { StatsService } from './stats.service';
import { ChartsService } from './charts.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly charts: ChartsService,
  ) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.stats.getStats(req.user.role);
  }

  @Get('charts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getCharts() {
    return this.charts.getCharts();
  }
}
