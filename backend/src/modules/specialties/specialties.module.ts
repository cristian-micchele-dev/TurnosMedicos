import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialtyController } from './adapters/http/specialty.controller';
import { SpecialtyService } from './application/specialty.service';
import { TypeOrmSpecialtyRepository } from './adapters/persistence/typeorm-specialty.repository';
import { SPECIALTY_REPOSITORY } from './specialty.repository.port';
import { SpecialtyOrmEntity } from './adapters/persistence/specialty.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpecialtyOrmEntity]),
  ],
  controllers: [SpecialtyController],
  providers: [
    SpecialtyService,
    TypeOrmSpecialtyRepository,
    { provide: SPECIALTY_REPOSITORY, useExisting: TypeOrmSpecialtyRepository },
  ],
  exports: [SpecialtyService, TypeOrmSpecialtyRepository, SPECIALTY_REPOSITORY],
})
export class SpecialtiesModule {}
