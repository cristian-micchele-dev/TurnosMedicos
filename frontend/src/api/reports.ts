import { api } from './client';
import type { PaginatedResponse } from './users';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface MedicalReport {
  id: string;
  appointmentId: string | null;
  doctorId: string;
  patientId: string;
  title: string;
  description: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const csrf = localStorage.getItem('csrf_token');
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

export const reportsApi = {
  upload: async (appointmentId: string, data: FormData): Promise<MedicalReport> => {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/reports`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: data,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { title?: string; detail?: string };
      throw { status: response.status, title: errorData.title ?? 'Error al subir el informe', detail: errorData.detail };
    }

    return response.json() as Promise<MedicalReport>;
  },

  findByAppointment: (appointmentId: string) =>
    api.get<MedicalReport[]>(`/appointments/${appointmentId}/reports`),

  download: async (report: MedicalReport): Promise<void> => {
    const response = await fetch(`${API_URL}/reports/${report.id}/download`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Error al descargar el informe');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.originalName;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  delete: (reportId: string) =>
    api.delete<void>(`/reports/${reportId}`),

  print: async (report: MedicalReport): Promise<void> => {
    const response = await fetch(`${API_URL}/reports/${report.id}/download`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Error al obtener el informe');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  },

  findByPatient: (patientId: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<MedicalReport>>(`/patients/${patientId}/reports?page=${page}&limit=${limit}`),

  uploadForPatient: async (patientId: string, data: FormData): Promise<MedicalReport> => {
    const response = await fetch(`${API_URL}/patients/${patientId}/reports`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: data,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { title?: string; detail?: string };
      throw { status: response.status, title: errorData.title ?? 'Error al subir el informe', detail: errorData.detail };
    }

    return response.json() as Promise<MedicalReport>;
  },
};
