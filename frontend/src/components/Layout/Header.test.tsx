import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './Header';

const { auth, doctorsApi, notificationsApi } = vi.hoisted(() => ({
  auth: { user: { id: 'u1', email: 'laura@turno.med', name: 'Laura Gómez', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  doctorsApi: { me: vi.fn(), avatarBlob: vi.fn() },
  notificationsApi: { inbox: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => null }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { info: vi.fn() } }) }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));
vi.mock('../../api/notifications', () => ({ notificationsApi }));

const renderHeader = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><Header onMenuToggle={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.role = 'DOCTOR';
  doctorsApi.me.mockResolvedValue({ id: 'd1', avatarFile: null });
  notificationsApi.inbox.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0, unread: 0 });
  notificationsApi.markRead.mockResolvedValue(undefined);
  notificationsApi.markAllRead.mockResolvedValue(undefined);
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:avatar');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('Header — identidad', () => {
  it('el nombre y el rol son un link al perfil', () => {
    renderHeader();
    const link = screen.getByRole('link', { name: /laura gómez/i });
    expect(link).toHaveAttribute('href', '/perfil');
    expect(link).toHaveTextContent(/doctor/i);
  });

  it('un médico con foto la ve en miniatura junto a su nombre', async () => {
    doctorsApi.me.mockResolvedValue({ id: 'd1', avatarFile: 'abc.png' });
    doctorsApi.avatarBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    renderHeader();
    expect(await screen.findByRole('img', { name: /laura gómez/i })).toHaveAttribute('src', 'blob:avatar');
  });

  it('un admin no consulta el perfil médico y ve sus iniciales', () => {
    auth.user.role = 'ADMIN';
    renderHeader();
    expect(screen.getByText('LG')).toBeInTheDocument();
    expect(doctorsApi.me).not.toHaveBeenCalled();
  });
});

describe('Header — la campanita', () => {
  const waiting = {
    data: [
      { id: 'n1', type: 'appointment_created', message: 'Nuevo turno: Emanuel — lunes 09:30', appointmentId: 'a1', read: false, createdAt: '2026-09-22T12:30:00.000Z' },
      { id: 'n2', type: 'appointment_cancelled', message: 'Turno cancelado: TM-00002', appointmentId: 'a2', read: true, createdAt: '2026-09-21T09:00:00.000Z' },
    ],
    total: 2, page: 1, limit: 20, totalPages: 1, unread: 1,
  };

  it('muestra lo que quedó esperando desde antes de entrar, no solo lo que llega en vivo', async () => {
    notificationsApi.inbox.mockResolvedValue(waiting);
    renderHeader();
    await userEvent.click(await screen.findByRole('button', { name: /notificaciones/i }));
    expect(screen.getByText(/nuevo turno: emanuel/i)).toBeInTheDocument();
    expect(screen.getByText(/turno cancelado/i)).toBeInTheDocument();
  });

  it('el contador sale del servidor, no de contar lo que la pestaña vio', async () => {
    notificationsApi.inbox.mockResolvedValue({ ...waiting, unread: 7 });
    renderHeader();
    expect(await screen.findByText('7')).toBeInTheDocument();
  });

  it('marcar una como leída lo pide al servidor y recarga la bandeja', async () => {
    notificationsApi.inbox.mockResolvedValue(waiting);
    renderHeader();
    await userEvent.click(await screen.findByRole('button', { name: /notificaciones/i }));
    await userEvent.click(screen.getByText(/nuevo turno: emanuel/i));
    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith('n1'));
  });
});
