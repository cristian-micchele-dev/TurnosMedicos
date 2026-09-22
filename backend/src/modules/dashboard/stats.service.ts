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
    const totalDoctors = allUsers.filter(u => u.role === Role.DOCTOR).length;

    if (role === Role.ADMIN) {
      const [, totalPatients] = await this.patients.findAll({ take: 1 });
      return {
        totalDoctors,
        totalPatients,
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.active).length,
      };
    }

    // The front desk works with people, not with the user census.
    if (role === Role.SECRETARY) {
      const [, totalPatients] = await this.patients.findAll({ take: 1 });
      return { totalDoctors, totalPatients };
    }

    // A doctor's numbers are their own agenda, which the appointments endpoint already
    // serves; the hospital census is none of their business.
    return {};
  }
}
