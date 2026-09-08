import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { PatientService } from '../../application/patient.service';
import { CreatePatientDto, UpdatePatientDto } from '../../application/dto/patient.dto';
import { ForbiddenError } from '../../../../shared/domain/errors';
import { PaginationDto } from '../../../../shared/application/pagination';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientController {
  constructor(private readonly service: PatientService) {}

  @Post() @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  create(@Body() dto: CreatePatientDto) {
    return this.service.create(dto);
  }

  @Get() @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get('me') @UseGuards(RolesGuard) @Roles(Role.PATIENT)
  findMe(@Req() req: Request) {
    return this.service.findByUserId((req as any).user.sub);
  }

  @Get(':id') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.PATIENT)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user.role === Role.PATIENT) {
      const patient = await this.service.findOne(id);
      if (patient.userId !== user.sub) throw new ForbiddenError();
    }
    return this.service.update(id, dto);
  }
}
