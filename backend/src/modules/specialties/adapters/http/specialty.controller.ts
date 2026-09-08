import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../../../auth/adapters/http/auth.guards';
import { Role } from '../../../users/domain/user';
import { SpecialtyService } from '../../application/specialty.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '../../application/dto/specialty.dto';
import { PaginationDto } from '../../../../shared/application/pagination';

@Controller('specialties')
export class SpecialtyController {
  constructor(private readonly service: SpecialtyService) {}

  @Get()
  findAll(@Query('all') all?: string, @Query() pagination?: PaginationDto) {
    return this.service.findAll(all !== 'true', pagination);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  create(@Body() dto: CreateSpecialtyDto) {
    return this.service.create(dto);
  }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @HttpCode(204) @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
