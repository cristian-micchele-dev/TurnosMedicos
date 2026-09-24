import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentOrmEntity } from '../appointments/adapters/persistence/appointment.entity';
import { SpecialtyOrmEntity } from '../specialties/adapters/persistence/specialty.entity';
import { APP_TIME_ZONE } from '../../shared/infra/time/format';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

@Injectable()
export class ChartsService {
  constructor(
    @InjectRepository(AppointmentOrmEntity)
    private readonly appointments: Repository<AppointmentOrmEntity>,
    @InjectRepository(SpecialtyOrmEntity)
    private readonly specialties: Repository<SpecialtyOrmEntity>,
  ) {}

  async getCharts() {
    const [appointmentsByMonth, appointmentsByStatus, topSpecialties] = await Promise.all([
      this.getAppointmentsByMonth(),
      this.getAppointmentsByStatus(),
      this.getTopSpecialties(),
    ]);

    return { appointmentsByMonth, appointmentsByStatus, topSpecialties };
  }

  private async getAppointmentsByMonth(): Promise<{ month: string; count: number }[]> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Agrupado en el huso de la clínica: un turno de las 22:00 en Buenos Aires
    // es la 01:00 del día siguiente en UTC, y el último de cada mes caía en el
    // mes siguiente. El reloj del servidor no es el reloj de la clínica.
    const mes = `TO_CHAR(a.date_time AT TIME ZONE :tz, 'YYYY-MM')`;
    const rows = await this.appointments
      .createQueryBuilder('a')
      .select(mes, 'yearMonth')
      .addSelect('COUNT(*)', 'count')
      .where('a.date_time >= :from', { from: sixMonthsAgo })
      .setParameter('tz', APP_TIME_ZONE)
      .groupBy(mes)
      .orderBy(mes, 'ASC')
      .getRawMany<{ yearMonth: string; count: string }>();

    // Build a complete 6-month range (fill gaps with 0)
    const result: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = rows.find((r) => r.yearMonth === key);
      result.push({ month: MONTH_LABELS[d.getMonth()], count: row ? Number(row.count) : 0 });
    }

    return result;
  }

  private async getAppointmentsByStatus(): Promise<{ status: string; count: number }[]> {
    const rows = await this.appointments
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((r) => ({
      status: STATUS_LABELS[r.status] ?? r.status,
      count: Number(r.count),
    }));
  }

  private async getTopSpecialties(): Promise<{ name: string; count: number }[]> {
    const rows = await this.appointments
      .createQueryBuilder('a')
      .innerJoin(SpecialtyOrmEntity, 's', 's.id = a.specialty_id')
      .select('s.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; count: string }>();

    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }
}
