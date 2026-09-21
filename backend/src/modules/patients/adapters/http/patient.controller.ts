import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { PatientService } from '../../application/patient.service';
import { CreatePatientDto, UpdatePatientDto } from '../../application/dto/patient.dto';
import { ForbiddenError } from '../../../../shared/domain/errors';
import { PaginationDto } from '../../../../shared/application/pagination';

// Patients are a hospital-wide registry: doctors register and update them too.
// Only ADMIN decides who is active in the system.
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly service: PatientService) {}

  @Post() @Roles(Role.ADMIN, Role.DOCTOR)
  create(@Body() dto: CreatePatientDto) {
    return this.service.create(dto);
  }

  @Get() @Roles(Role.ADMIN, Role.DOCTOR)
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id') @Roles(Role.ADMIN, Role.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id') @Roles(Role.ADMIN, Role.DOCTOR)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @Req() req: Request) {
    if ((req as any).user.role !== Role.ADMIN && dto.active !== undefined) throw new ForbiddenError();
    return this.service.update(id, dto);
  }
}
