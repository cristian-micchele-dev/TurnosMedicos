import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../users/user.repository.port';
import { Role } from '../users/domain/user';
import { PatientRepository, PATIENT_REPOSITORY } from '../patients/patient.repository.port';

@Injectable()
export class StatsService {
  constructor(
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
  ) {}

  async getStats(role: Role) {
    const [allUsers] = await this.users.findAll();

    if (role === Role.ADMIN) {
      const [, totalPatients] = await this.patients.findAll({ take: 1 });
      return {
        totalDoctors: allUsers.filter(u => u.role === Role.DOCTOR).length,
        totalPatients,
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.active).length,
      };
    }

    return {
      totalUsers: allUsers.length,
    };
  }
}
