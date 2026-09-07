import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { AppointmentService } from '../../application/appointment.service';
import { CreateAppointmentDto, CancelAppointmentDto, QueryAppointmentsDto } from '../../application/dto/appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryAppointmentsDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.findAll(query, user.sub, user.role);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/confirm') @UseGuards(RolesGuard) @Roles(Role.DOCTOR, Role.ADMIN)
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.confirm(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelAppointmentDto) {
    return this.service.cancel(id, dto);
  }

  @Patch(':id/complete') @UseGuards(RolesGuard) @Roles(Role.DOCTOR, Role.ADMIN)
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.complete(id);
  }
}
