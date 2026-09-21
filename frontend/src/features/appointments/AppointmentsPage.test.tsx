import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentsPage } from './AppointmentsPage';

const { toast, auth, appointmentsApi, specialtiesApi } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  auth: { user: { id: 'u1', email: 'a@h.com', name: 'Admin', role: 'ADMIN' as const, mustChangePassword: false } },
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
});
