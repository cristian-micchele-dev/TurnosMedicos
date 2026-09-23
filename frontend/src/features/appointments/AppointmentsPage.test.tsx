import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentsPage } from './AppointmentsPage';
import { todayLocal, addDaysLocal } from '../../utils/date';

const { toast, auth, appointmentsApi, specialtiesApi } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  auth: { user: { id: 'u1', email: 'a@h.com', name: 'Admin', role: 'ADMIN' as 'ADMIN' | 'DOCTOR', mustChangePassword: false } },
  appointmentsApi: { findAll: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), complete: vi.fn() },
  specialtiesApi: { findAll: vi.fn() },
}));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/appointments', () => ({ appointmentsApi }));
vi.mock('../../api/specialties', () => ({ specialtiesApi }));

function LocationProbe() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

const renderAt = (url: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/turnos" element={<><AppointmentsPage /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  appointmentsApi.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
  specialtiesApi.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
});

describe('AppointmentsPage — filtros en la URL', () => {
  it('lee ?status= de la URL y lo aplica al pedido y al select', async () => {
    renderAt('/turnos?status=PENDING');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(appointmentsApi.findAll.mock.calls[0][0]).toMatchObject({ status: 'PENDING' });
    expect(screen.getByLabelText(/estado/i)).toHaveValue('PENDING');
  });

  it('lee ?from= y ?to= de la URL', async () => {
    renderAt('/turnos?from=2026-09-21&to=2026-09-21');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(appointmentsApi.findAll.mock.calls[0][0]).toMatchObject({ from: '2026-09-21', to: '2026-09-21' });
  });

  it('cambiar el estado actualiza la URL sin apilar historial', async () => {
    renderAt('/turnos');
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'COMPLETED' } });
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('status=COMPLETED'));
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
  });

  it('DOCTOR ve el switch Día | Lista con Lista activo, sin una segunda URL para lo mismo', async () => {
    auth.user.role = 'DOCTOR';
    renderAt('/turnos');
    const lista = await screen.findByRole('link', { name: /^lista$/i });
    expect(lista).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^día$/i })).toHaveAttribute('href', '/agenda');
    auth.user.role = 'ADMIN';
  });

  it('ADMIN en /turnos no ve el switch', async () => {
    auth.user.role = 'ADMIN';
    renderAt('/turnos');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /^lista$/i })).not.toBeInTheDocument();
  });

  it('el filtro de especialidad solo existe para ADMIN (un médico tiene una sola)', async () => {
    auth.user.role = 'DOCTOR';
    renderAt('/turnos');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalled());
    expect(screen.queryByLabelText(/especialidad/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    auth.user.role = 'ADMIN';
  });
});

describe('AppointmentsPage — llegar desde un código', () => {
  const turno = {
    id: 'a1', code: 'TM-00012', doctorId: 'd1', patientId: 'p1', specialtyId: 's1',
    dateTime: '2026-09-28T12:00:00.000Z', durationMinutes: 30, status: 'PENDING' as const,
    notes: null, diagnosis: null, cancellationReason: null,
    patient: { id: 'p1', name: 'Emanuel Micchele', email: null },
  };

  it('si la URL trae un código exacto, abre ese turno sin que haya que buscarlo', async () => {
    appointmentsApi.findAll.mockResolvedValue({ data: [turno], total: 1, page: 1, totalPages: 1 });
    renderAt('/turnos?q=TM-00012');
    expect(await screen.findByText(/detalle del turno/i)).toBeInTheDocument();
  });

  it('una búsqueda común no abre nada sola', async () => {
    appointmentsApi.findAll.mockResolvedValue({ data: [turno], total: 1, page: 1, totalPages: 1 });
    renderAt('/turnos?q=emanuel');
    await screen.findByText('TM-00012');
    expect(screen.queryByText(/detalle del turno/i)).not.toBeInTheDocument();
  });
});

describe('AppointmentsPage — qué se muestra primero', () => {
  it('por defecto pide lo que viene: desde hoy y con lo más próximo primero', async () => {
    renderAt('/turnos');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ from: todayLocal(), order: 'asc' }), 1,
    ));
  });

  it('el historial va al revés: hasta ayer y lo más reciente primero', async () => {
    renderAt('/turnos?view=history');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ to: addDaysLocal(todayLocal(), -1), order: 'desc' }), 1,
    ));
  });

  it('en "todos" no hay recorte de fechas', async () => {
    renderAt('/turnos?view=all');
    await waitFor(() => {
      const filters = appointmentsApi.findAll.mock.calls.at(-1)![0];
      expect(filters.from).toBeUndefined();
      expect(filters.to).toBeUndefined();
    });
  });

  it('una fecha elegida a mano gana sobre la vista', async () => {
    renderAt('/turnos?view=upcoming&from=2026-01-01');
    await waitFor(() => expect(appointmentsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01' }), 1,
    ));
  });
});

describe('AppointmentsPage — quién filtra', () => {
  it('la búsqueda la resuelve el servidor: filtrar la página traída es filtrar una muestra', async () => {
    renderAt('/turnos?q=perez');
    await waitFor(() => expect(appointmentsApi.findAll.mock.calls.at(-1)![0]).toMatchObject({ q: 'perez' }));
  });

  it('la especialidad viaja como id, no como texto', async () => {
    specialtiesApi.findAll.mockResolvedValue({
      data: [{ id: 'esp-1', name: 'Cardiología' }], total: 1, page: 1, totalPages: 1,
    });
    renderAt('/turnos?specialty=esp-1');
    await waitFor(() => expect(appointmentsApi.findAll.mock.calls.at(-1)![0]).toMatchObject({ specialtyId: 'esp-1' }));
  });

  it('muestra lo que devuelve el servidor, sin recortarlo de nuevo en el navegador', async () => {
    appointmentsApi.findAll.mockResolvedValue({
      data: [{
        id: 'a1', code: 'TM-00042', doctorId: 'd1', patientId: 'p1', specialtyId: 's1',
        dateTime: '2026-09-25T13:00:00.000Z', durationMinutes: 30, status: 'PENDING',
        notes: null, diagnosis: null, cancellationReason: null,
        patient: { id: 'p1', name: 'Sofía Pérez', email: null },
      }],
      total: 1, page: 1, totalPages: 1,
    });
    renderAt('/turnos?q=cualquier+cosa+que+el+navegador+no+sabria+matchear');
    expect(await screen.findByText('TM-00042')).toBeInTheDocument();
  });
});
