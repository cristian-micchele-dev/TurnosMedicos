import { api } from './client';

export interface DashboardStats {
  totalDoctors?: number;
  totalPatients?: number;
  totalUsers?: number;
  activeUsers?: number;
}

export interface ChartData {
  appointmentsByMonth: { month: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
  topSpecialties: { name: string; count: number }[];
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getCharts: () => api.get<ChartData>('/dashboard/charts'),
};
