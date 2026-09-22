import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { Actor } from '../../../users/domain/actor';
import { AppointmentService } from '../../application/appointment.service';
import { CreateAppointmentDto, CancelAppointmentDto, CompleteAppointmentDto, QueryAppointmentsDto, RescheduleAppointmentDto, SummaryAppointmentsDto } from '../../application/dto/appointment.dto';

const actorOf = (req: Request): Actor => (req as Request & { user: Actor }).user;

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto, @Req() req: Request) {
    return this.service.create(dto, actorOf(req));
  }

  @Get()
  findAll(@Query() query: QueryAppointmentsDto, @Req() req: Request) {
    const user = actorOf(req);
    return this.service.findAll(query, user.sub, user.role);
  }

  @Get('summary')
  summary(@Query() query: SummaryAppointmentsDto, @Req() req: Request) {
    const user = actorOf(req);
    return this.service.summary(query, user.sub, user.role);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.findOne(id, actorOf(req));
  }

  @Patch(':id/confirm') @UseGuards(RolesGuard) @Roles(Role.DOCTOR, Role.ADMIN, Role.SECRETARY)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.confirm(id, actorOf(req));
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelAppointmentDto, @Req() req: Request) {
    return this.service.cancel(id, dto, actorOf(req));
  }

  @Patch(':id/reschedule') @UseGuards(RolesGuard) @Roles(Role.DOCTOR, Role.ADMIN, Role.SECRETARY)
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RescheduleAppointmentDto, @Req() req: Request) {
    return this.service.reschedule(id, dto, actorOf(req));
  }

  @Patch(':id/complete') @UseGuards(RolesGuard) @Roles(Role.DOCTOR, Role.ADMIN)
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteAppointmentDto, @Req() req: Request) {
    return this.service.complete(id, dto, actorOf(req));
  }
}
