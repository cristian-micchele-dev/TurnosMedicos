import { api } from './client';

export interface DashboardStats {
  totalDoctors?: number;
  totalPatients?: number;
  totalUsers?: number;
  activeUsers?: number;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
};
