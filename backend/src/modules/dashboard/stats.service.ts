import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../users/user.repository.port';
import { Role } from '../users/domain/user';
import { PatientRepository, PATIENT_REPOSITORY } from '../patients/patient.repository.port';
import { DoctorRepository, DOCTOR_REPOSITORY } from '../doctors/doctor.repository.port';

@Injectable()
export class StatsService {
  constructor(
    @Inject('USER_REPOSITORY') private readonly users: UserRepository,
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject(DOCTOR_REPOSITORY) private readonly doctors: DoctorRepository,
  ) {}

  async getStats(role: Role) {
    // Una cuenta con rol DOCTOR no es un médico agendable: el perfil (matrícula y
    // especialidad) es lo que lo vuelve elegible en un turno. Contamos perfiles activos.
    const [, totalDoctors] = await this.doctors.findAll({ active: true, take: 1 });

    if (role === Role.ADMIN) {
      // El censo se cuenta en la base. Traer el padrón para hacerle .length es
      // gastar memoria proporcional a los usuarios para producir dos enteros.
      const [[, totalPatients], census] = await Promise.all([
        this.patients.findAll({ take: 1 }),
        this.users.countAll(),
      ]);
      return {
        totalDoctors,
        totalPatients,
        totalUsers: census.total,
        activeUsers: census.active,
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
