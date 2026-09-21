import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarPage } from './CalendarPage';

const { navigate, auth, appointmentsApi } = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: { user: { id: 'u1', email: 'x@h.com', name: 'X', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  appointmentsApi: { summary: vi.fn(), findAll: vi.fn() },
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/appointments', () => ({ appointmentsApi }));

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><CalendarPage /></MemoryRouter></QueryClientProvider>);
};

const today = new Date();
const y = today.getFullYear(), m = today.getMonth();
const iso = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

beforeEach(() => {
  vi.clearAllMocks();
  appointmentsApi.summary.mockResolvedValue([
    { date: iso(15), status: 'PENDING', count: 2 },
    { date: iso(15), status: 'COMPLETED', count: 1 },
  ]);
});

describe('CalendarPage', () => {
  it('pide el resumen agregado del mes, no los turnos', async () => {
    renderPage();
    await waitFor(() => expect(appointmentsApi.summary).toHaveBeenCalledWith(iso(1), iso(new Date(y, m + 1, 0).getDate())));
    expect(appointmentsApi.findAll).not.toHaveBeenCalled();
  });

  it('muestra el total de turnos del día en la celda', async () => {
    renderPage();
    const cell = await screen.findByRole('button', { name: new RegExp(`^15 de .*, 3 turno`, 'i') });
    expect(cell).toBeInTheDocument();
  });

  it('DOCTOR: click en un día abre su agenda de ese día', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^15 de /i }));
    expect(navigate).toHaveBeenCalledWith(`/agenda?date=${iso(15)}`);
  });

  it('ADMIN: click en un día abre Turnos filtrado por ese día', async () => {
    auth.user.role = 'ADMIN';
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^15 de /i }));
    expect(navigate).toHaveBeenCalledWith(`/turnos?from=${iso(15)}&to=${iso(15)}`);
  });

  it('ya no muestra un panel de lista debajo del mes', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /^15 de /i }));
    expect(screen.queryByText(/turnos del/i)).not.toBeInTheDocument();
  });
});
