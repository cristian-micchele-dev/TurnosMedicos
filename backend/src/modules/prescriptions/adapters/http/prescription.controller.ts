import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { Actor } from '../../../users/domain/actor';
import { PrescriptionService } from '../../application/prescription.service';
import { CreatePrescriptionDto } from '../../application/dto/prescription.dto';

const actorOf = (req: Request): Actor => (req as Request & { user: Actor }).user;

@Controller()
@UseGuards(JwtAuthGuard)
export class PrescriptionController {
  constructor(private readonly service: PrescriptionService) {}

  @Post('appointments/:appointmentId/prescriptions')
  @UseGuards(RolesGuard)
  @Roles(Role.DOCTOR)
  create(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: CreatePrescriptionDto,
    @Req() req: Request,
  ) {
    return this.service.create(actorOf(req).sub, appointmentId, dto);
  }

  @Get('appointments/:appointmentId/prescriptions')
  findByAppointment(@Param('appointmentId', ParseUUIDPipe) appointmentId: string, @Req() req: Request) {
    return this.service.findByAppointment(appointmentId, actorOf(req));
  }

  @Get('prescriptions/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.findOne(id, actorOf(req));
  }

  @Get('patients/:patientId/prescriptions')
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Req() req: Request,
  ) {
    return this.service.findByPatient(patientId, page, limit, actorOf(req));
  }
}
