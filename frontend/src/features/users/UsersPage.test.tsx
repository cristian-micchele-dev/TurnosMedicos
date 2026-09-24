import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsersPage } from './UsersPage';

const { toast, auth, usersApi, confirm } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  auth: { user: { id: 'yo', email: 'jefe@h.com', name: 'Jefe', role: 'ADMIN' as const, mustChangePassword: false } },
  usersApi: { findAll: vi.fn(), updateRole: vi.fn(), toggleActive: vi.fn(), resetPassword: vi.fn(), create: vi.fn() },
  confirm: vi.fn(),
}));

vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/users', () => ({ usersApi }));
vi.mock('../../hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm, dialogProps: { isOpen: false }, ConfirmDialog: () => null }),
}));

const fila = (nombre: string) => ({
  id: nombre, email: `${nombre}@h.com`, name: nombre,
  role: 'ADMIN' as 'ADMIN' | 'DOCTOR' | 'SECRETARY', active: true, createdAt: '2026-01-01T00:00:00.000Z',
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><UsersPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

/** La fila de la tabla donde aparece ese email. */
const filaDe = async (email: string) => {
  const celda = await screen.findByText(email);
  return celda.closest('tr') as HTMLElement;
};

beforeEach(() => {
  vi.clearAllMocks();
  confirm.mockResolvedValue(true);
  usersApi.findAll.mockResolvedValue({
    data: [fila('yo'), { ...fila('colega'), role: 'DOCTOR' as const }],
    total: 2, page: 1, totalPages: 1,
  });
});

describe('UsersPage — nadie se administra a sí mismo', () => {
  it('no te deja cambiarte el rol: el último admin no puede quedarse afuera de un portazo', async () => {
    renderPage();
    const mia = await filaDe('yo@h.com');
    expect(within(mia).getByRole('combobox')).toBeDisabled();
  });

  it('no te deja desactivarte a vos mismo', async () => {
    renderPage();
    const mia = await filaDe('yo@h.com');
    expect(within(mia).getByRole('button', { name: /desactivar usuario/i })).toBeDisabled();
  });

  it('no te deja resetearte la clave: para eso está cambiar contraseña', async () => {
    renderPage();
    const mia = await filaDe('yo@h.com');
    expect(within(mia).getByRole('button', { name: /resetear clave/i })).toBeDisabled();
  });

  it('sobre otro usuario, las tres acciones siguen disponibles', async () => {
    renderPage();
    const suya = await filaDe('colega@h.com');
    expect(within(suya).getByRole('combobox')).toBeEnabled();
    expect(within(suya).getByRole('button', { name: /desactivar usuario/i })).toBeEnabled();
    expect(within(suya).getByRole('button', { name: /resetear clave/i })).toBeEnabled();
  });
});

describe('UsersPage — cambiar un rol se confirma antes', () => {
  it('pregunta antes de tocar el rol de alguien', async () => {
    renderPage();
    const suya = await filaDe('colega@h.com');
    usersApi.updateRole.mockResolvedValue({ ...fila('colega'), role: 'ADMIN' });
    await userEvent.selectOptions(within(suya).getByRole('combobox'), 'ADMIN');
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(usersApi.updateRole).toHaveBeenCalledWith('colega', 'ADMIN');
  });

  it('si decís que no, no se manda nada: hacer admin a alguien no puede ser un clic distraído', async () => {
    confirm.mockResolvedValue(false);
    renderPage();
    const suya = await filaDe('colega@h.com');
    await userEvent.selectOptions(within(suya).getByRole('combobox'), 'ADMIN');
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(usersApi.updateRole).not.toHaveBeenCalled();
  });

  it('un rechazo del servidor se muestra tal cual lo explicó el servidor', async () => {
    usersApi.updateRole.mockRejectedValue({ status: 409, detail: 'No podés cambiarle el rol a tu propia cuenta.' });
    renderPage();
    const suya = await filaDe('colega@h.com');
    await userEvent.selectOptions(within(suya).getByRole('combobox'), 'ADMIN');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No podés cambiarle el rol a tu propia cuenta.'));
  });
});

describe('UsersPage — la clave temporal', () => {
  it('se muestra una sola vez, junto al mail de quien la va a usar', async () => {
    usersApi.resetPassword.mockResolvedValue({ temporaryPassword: 'colina ventana 41' });
    renderPage();
    const suya = await filaDe('colega@h.com');
    await userEvent.click(within(suya).getByRole('button', { name: /resetear clave/i }));
    expect(await screen.findByText('colina ventana 41')).toBeInTheDocument();
    expect(screen.getAllByText(/colega@h\.com/).length).toBeGreaterThan(0);
  });

  it('nunca se pide sin confirmar: cierra todas las sesiones de esa persona', async () => {
    confirm.mockResolvedValue(false);
    renderPage();
    const suya = await filaDe('colega@h.com');
    await userEvent.click(within(suya).getByRole('button', { name: /resetear clave/i }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(usersApi.resetPassword).not.toHaveBeenCalled();
  });
});
