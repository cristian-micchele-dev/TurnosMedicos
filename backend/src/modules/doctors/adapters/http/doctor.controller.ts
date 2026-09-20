import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { DoctorService } from '../../application/doctor.service';
import { CreateDoctorDto, UpdateDoctorDto, SetAvailabilityDto, CreateScheduleBlockDto } from '../../application/dto/doctor.dto';
import { PaginationDto } from '../../../../shared/application/pagination';
import { Actor } from '../../../users/domain/actor';

const actorOf = (req: Request): Actor => (req as Request & { user: Actor }).user;

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
    return this.service.findByUserId(actorOf(req).sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDoctorDto, @Req() req: Request) {
    return this.service.update(id, dto, actorOf(req));
  }

  @Post(':id/availability') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  setAvailability(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetAvailabilityDto, @Req() req: Request) {
    return this.service.setAvailability(id, dto, actorOf(req));
  }

  @Get(':id/availability')
  getAvailability(@Param('id', ParseUUIDPipe) id: string, @Query('date') date?: string) {
    return this.service.getAvailability(id, date);
  }

  @Post(':id/blocks') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  addBlock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateScheduleBlockDto, @Req() req: Request) {
    return this.service.addBlock(id, dto, actorOf(req));
  }

  @Get(':id/blocks')
  getBlocks(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getBlocks(id);
  }

  @Delete(':id/blocks/:blockId') @UseGuards(RolesGuard) @Roles(Role.ADMIN, Role.DOCTOR)
  removeBlock(@Param('id', ParseUUIDPipe) id: string, @Param('blockId', ParseUUIDPipe) blockId: string, @Req() req: Request) {
    return this.service.removeBlock(id, blockId, actorOf(req));
  }
}
