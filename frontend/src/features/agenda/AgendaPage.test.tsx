import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgendaPage } from './AgendaPage';
import { todayLocal, localDateTimeToIso, addDaysLocal } from '../../utils/date';

const { toast, appointmentsApi, doctorsApi } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  appointmentsApi: { findAll: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), complete: vi.fn() },
  doctorsApi: { me: vi.fn(), getAvailability: vi.fn() },
}));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../api/appointments', () => ({ appointmentsApi }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));

const appt = (id: string, dateTime: string, name: string) => ({
  id, code: `TM-${id}`, doctorId: 'd1', patientId: 'p1', specialtyId: 's1', dateTime, durationMinutes: 30,
  status: 'CONFIRMED', notes: null, diagnosis: null, cancellationReason: null, createdAt: dateTime,
  patient: { id: 'p1', name, email: null },
});

const renderPage = (url = '/agenda') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path="/agenda" element={<AgendaPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  doctorsApi.me.mockResolvedValue({ id: 'd1' });
  doctorsApi.getAvailability.mockResolvedValue([
    { id: 'a1', doctorId: 'd1', dayOfWeek: new Date().getDay(), startTime: '08:00', endTime: '12:00', slotDuration: 30 },
    { id: 'a2', doctorId: 'd1', dayOfWeek: new Date().getDay(), startTime: '16:30', endTime: '20:00', slotDuration: 30 },
  ]);
  appointmentsApi.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
});

describe('AgendaPage', () => {
  it('pide exactamente el día visible (from === to), no dos días', async () => {
    renderPage();
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    const [filters] = appointmentsApi.findAll.mock.calls[0];
    expect(filters.from).toBe(todayLocal());
    expect(filters.to).toBe(todayLocal());
  });

  it('no dibuja en el día de hoy un turno que es de mañana', async () => {
    const today = todayLocal();
    appointmentsApi.findAll.mockResolvedValue({
      data: [appt('1', localDateTimeToIso(today, '09:00'), 'Ana Hoy'), appt('2', localDateTimeToIso(addDaysLocal(today, 1), '09:00'), 'Bruno Mañana')],
      total: 2, page: 1, totalPages: 1,
    });
    renderPage();
    expect(await screen.findByRole('button', { name: /turno de ana hoy/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /turno de bruno mañana/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Bruno Mañana')).not.toBeInTheDocument();
  });

  it('sombrea los bloques de disponibilidad del médico para ese día', async () => {
    renderPage();
    expect(await screen.findByLabelText('Disponible 08:00–12:00')).toBeInTheDocument();
    expect(screen.getByLabelText('Disponible 16:30–20:00')).toBeInTheDocument();
  });

  it('muestra la línea de tiempo aunque no haya turnos', async () => {
    renderPage();
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(await screen.findByText(/sin turnos/i)).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
  });

  it('deriva el rango horario de la disponibilidad con una hora de margen', async () => {
    renderPage();
    await screen.findByLabelText('Disponible 08:00–12:00');
    expect(screen.getByText('07:00')).toBeInTheDocument();
    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
    expect(screen.queryByText('22:00')).not.toBeInTheDocument();
  });

  it('abre el día que viene en ?date= (deep link desde el calendario)', async () => {
    renderPage('/agenda?date=2026-10-05');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(appointmentsApi.findAll.mock.calls[0][0]).toMatchObject({ from: '2026-10-05', to: '2026-10-05' });
    expect(screen.getByText(/lunes 5 de octubre, 2026/i)).toBeInTheDocument();
  });

  it('ofrece volver a la vista de mes', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /ver mes/i })).toHaveAttribute('href', '/calendario');
  });
});
