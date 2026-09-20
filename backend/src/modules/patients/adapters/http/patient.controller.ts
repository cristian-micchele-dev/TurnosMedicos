import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { PatientService } from '../../application/patient.service';
import { CreatePatientDto, UpdatePatientDto } from '../../application/dto/patient.dto';
import { PaginationDto } from '../../../../shared/application/pagination';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly service: PatientService) {}

  @Post() @Roles(Role.ADMIN)
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

  @Patch(':id') @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto) {
    return this.service.update(id, dto);
  }
}
