import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { DoctorService } from '../../application/doctor.service';
import { CreateDoctorDto, UpdateDoctorDto, SetAvailabilityDto } from '../../application/dto/doctor.dto';
import { PaginationDto } from '../../../../shared/application/pagination';

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorController {
  constructor(private readonly service: DoctorService) {}

  @Post() @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('specialtyId') specialtyId?: string, @Query() pagination?: PaginationDto) {
    return this.service.findAll(specialtyId ? { specialtyId } : undefined, pagination);
  }

  @Get('me')
  findMe(@Req() req: Request) {
    return this.service.findByUserId((req as any).user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDoctorDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/availability') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  setAvailability(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAvailabilityDto) {
    return this.service.setAvailability(id, dto);
  }

  @Get(':id/availability')
  getAvailability(@Param('id', ParseUUIDPipe) id: string, @Query('date') date?: string) {
    return this.service.getAvailability(id, date);
  }
}
