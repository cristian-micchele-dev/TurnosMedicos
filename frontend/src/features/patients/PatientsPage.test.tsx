import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientsPage } from './PatientsPage';

const { auth, patientsApi } = vi.hoisted(() => ({
  auth: { user: { id: 'u1', email: 'admin@turno.med', name: 'Root', role: 'ADMIN' as 'ADMIN' | 'DOCTOR', mustChangePassword: false } },
  patientsApi: { findAll: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/patients', () => ({ patientsApi }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }) }));

const row = (id: string, name: string) => ({
  id, name, email: `${id}@mail.com`, phone: null, dateOfBirth: null, address: null, insuranceNumber: null, notes: null, active: true, createdAt: '2026-01-01T00:00:00.000Z',
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><PatientsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  // Like the API: the first page holds 20 of 250 patients; `q` narrows the whole registry.
  patientsApi.findAll.mockImplementation(async (_page: number, _limit: number, q?: string) => {
    if (q) return { data: [row('p-far', 'Zulema Zapata')], total: 1, page: 1, totalPages: 1 };
    return { data: Array.from({ length: 20 }, (_, i) => row(`p${i}`, `Paciente ${i}`)), total: 250, page: 1, totalPages: 13 };
  });
});

describe('PatientsPage — búsqueda', () => {
  it('busca en el servidor: encuentra a quien no está en la página cargada', async () => {
    renderPage();
    expect(await screen.findByText('Paciente 0')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox'), 'zapata');
    expect(await screen.findByText('Zulema Zapata')).toBeInTheDocument();
    await waitFor(() => expect(patientsApi.findAll).toHaveBeenLastCalledWith(1, expect.any(Number), 'zapata'));
    expect(screen.queryByText('Paciente 0')).not.toBeInTheDocument();
  });

  it('no consulta por cada tecla: solo con el término ya escrito', async () => {
    renderPage();
    await screen.findByText('Paciente 0');
    await userEvent.type(screen.getByRole('searchbox'), 'zap');
    await screen.findByText('Zulema Zapata');
    const terms = patientsApi.findAll.mock.calls.map((c) => c[2]).filter(Boolean);
    expect(terms).toEqual(['zap']);
  });
});
