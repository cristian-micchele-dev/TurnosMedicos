import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../users/user.repository.port';
import { Role } from '../users/domain/user';

@Injectable()
export class StatsService {
  constructor(@Inject('USER_REPOSITORY') private readonly users: UserRepository) {}

  async getStats(role: Role, userId: string) {
    const [allUsers] = await this.users.findAll();

    if (role === Role.ADMIN) {
      return {
        totalDoctors: allUsers.filter(u => u.role === Role.DOCTOR).length,
        totalPatients: allUsers.filter(u => u.role === Role.PATIENT).length,
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.active).length,
      };
    }

    // For DOCTOR and PATIENT, return minimal stats for now
    return {
      totalUsers: allUsers.length,
    };
  }
}
