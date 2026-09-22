import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditPage } from './AuditPage';

const { auditApi, usersApi, patientsApi } = vi.hoisted(() => ({
  auditApi: { findAll: vi.fn() },
  usersApi: { findAll: vi.fn() },
  patientsApi: { findAll: vi.fn() },
}));

vi.mock('../../api/audit', () => ({ auditApi }));
vi.mock('../../api/users', () => ({ usersApi }));
vi.mock('../../api/patients', () => ({ patientsApi }));

const entries = [
  {
    id: 'e1', occurredAt: '2026-09-22T15:30:00.000Z', actorId: 'u-doc', actorRole: 'DOCTOR' as const,
    action: 'RECORD_ACCESS_DENIED' as const, targetType: 'patient', targetId: 'p-1', metadata: {},
  },
  {
    id: 'e2', occurredAt: '2026-09-22T15:00:00.000Z', actorId: 'u-admin', actorRole: 'ADMIN' as const,
    action: 'USER_ROLE_CHANGED' as const, targetType: 'user', targetId: 'u-doc',
    metadata: { from: 'DOCTOR', to: 'ADMIN' },
  },
];

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AuditPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auditApi.findAll.mockResolvedValue({ data: entries, total: 2, page: 1, totalPages: 1 });
  usersApi.findAll.mockResolvedValue({
    data: [
      { id: 'u-doc', name: 'Laura Gómez', email: 'laura@turno.med', role: 'DOCTOR', active: true },
      { id: 'u-admin', name: 'Root Admin', email: 'admin@turno.med', role: 'ADMIN', active: true },
    ],
    total: 2, page: 1, totalPages: 1,
  });
  patientsApi.findAll.mockResolvedValue({
    data: [{ id: 'p-1', name: 'Emanuel Micchele', email: null, active: true }],
    total: 1, page: 1, totalPages: 1,
  });
});

describe('AuditPage', () => {
  const bodyRows = async () => {
    await screen.findByText('Emanuel Micchele');
    return within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
  };

  it('traduce el identificador a la persona: quién lo hizo y sobre quién', async () => {
    renderPage();
    const [denied, roleChange] = await bodyRows();
    // El médico miró la ficha de un paciente…
    expect(within(denied).getByText('Laura Gómez')).toBeInTheDocument();
    expect(within(denied).getByText('Emanuel Micchele')).toBeInTheDocument();
    // …y en la otra fila el médico es el sujeto, no el actor.
    expect(within(roleChange).getByText('Root Admin')).toBeInTheDocument();
    expect(within(roleChange).getByText('Laura Gómez')).toBeInTheDocument();
  });

  it('el acceso denegado se lee distinto del concedido, no es una fila más', async () => {
    renderPage();
    const denied = await screen.findByText(/acceso denegado/i);
    expect(denied).toBeInTheDocument();
    expect(screen.getByText(/cambio de rol/i)).toBeInTheDocument();
  });

  it('muestra el detalle del cambio en palabras, no el JSON crudo', async () => {
    renderPage();
    expect(await screen.findByText(/DOCTOR → ADMIN/)).toBeInTheDocument();
  });

  it('filtrar por acción vuelve a preguntarle al servidor', async () => {
    renderPage();
    await bodyRows();
    await userEvent.selectOptions(screen.getByLabelText(/acción/i), 'RECORD_ACCESS_DENIED');
    await waitFor(() => expect(auditApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'RECORD_ACCESS_DENIED' }), 1, expect.any(Number),
    ));
  });

  it('si el actor ya no existe no rompe: muestra el identificador', async () => {
    auditApi.findAll.mockResolvedValue({
      data: [{ ...entries[0], actorId: 'u-borrado', actorRole: 'DOCTOR' as const }],
      total: 1, page: 1, totalPages: 1,
    });
    renderPage();
    const row = await screen.findByText(/u-borrado/i);
    expect(row).toBeInTheDocument();
  });

  it('sin registros lo dice con una explicación, no con una tabla vacía', async () => {
    auditApi.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
    renderPage();
    expect(await screen.findByText(/todavía no hay actividad registrada/i)).toBeInTheDocument();
  });
});
