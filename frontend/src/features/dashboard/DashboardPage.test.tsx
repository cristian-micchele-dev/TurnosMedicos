import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

const { auth, dashboardApi, appointmentsApi } = vi.hoisted(() => ({
  auth: { user: { id: 'u1', email: 'x@h.com', name: 'X', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  dashboardApi: { getStats: vi.fn(), getCharts: vi.fn() },
  appointmentsApi: { findAll: vi.fn() },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/dashboard', () => ({ dashboardApi }));
vi.mock('../../api/appointments', () => ({ appointmentsApi }));

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  dashboardApi.getStats.mockResolvedValue({ totalDoctors: 2, totalPatients: 5, totalUsers: 3, activeUsers: 3 });
  dashboardApi.getCharts.mockResolvedValue(null);
  appointmentsApi.findAll.mockResolvedValue({ data: [], total: 4, page: 1, totalPages: 1 });
});

describe('DashboardPage — stat cards deep-link', () => {
  it('DOCTOR: cada card lleva a su vista con el filtro aplicado', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    expect(await screen.findByRole('link', { name: /turnos hoy/i })).toHaveAttribute('href', '/agenda');
    expect(screen.getByRole('link', { name: /pendientes/i })).toHaveAttribute('href', '/mis-turnos?status=PENDING');
    expect(screen.getByRole('link', { name: /completados/i })).toHaveAttribute('href', '/mis-turnos?status=COMPLETED');
  });

  it('ADMIN: las cards de entidades llevan a su listado', async () => {
    auth.user.role = 'ADMIN';
    renderPage();
    expect(await screen.findByRole('link', { name: /doctores/i })).toHaveAttribute('href', '/doctores');
    expect(screen.getByRole('link', { name: /pacientes/i })).toHaveAttribute('href', '/pacientes');
    expect(screen.getByRole('link', { name: /usuarios/i })).toHaveAttribute('href', '/usuarios');
  });
});
