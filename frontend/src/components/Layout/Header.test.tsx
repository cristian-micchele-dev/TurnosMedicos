import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './Header';

const { auth, doctorsApi } = vi.hoisted(() => ({
  auth: { user: { id: 'u1', email: 'laura@turno.med', name: 'Laura Gómez', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  doctorsApi: { me: vi.fn(), avatarBlob: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
vi.mock('../../hooks/useSocket', () => ({ useSocket: () => null }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { info: vi.fn() } }) }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));

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
