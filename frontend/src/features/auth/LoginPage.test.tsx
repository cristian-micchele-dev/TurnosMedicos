import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const { navigate, auth } = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: { login: vi.fn() },
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);
const submit = async () => {
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@h.com');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'Admin1234');
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
};

beforeEach(() => { vi.clearAllMocks(); auth.login.mockResolvedValue(undefined); });

describe('LoginPage — recordarme', () => {
  it('por defecto no recuerda la sesión', async () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: /recordarme/i })).not.toBeChecked();
    await submit();
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('admin@h.com', 'Admin1234', false));
  });

  it('con el checkbox marcado envía rememberMe=true', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('checkbox', { name: /recordarme/i }));
    await submit();
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('admin@h.com', 'Admin1234', true));
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});

describe('LoginPage — qué le dice al que no puede entrar', () => {
  it('muestra el motivo real del servidor: el cliente rechaza con un objeto, no con un Error', async () => {
    auth.login.mockRejectedValue({
      status: 429,
      code: 'ACCOUNT_LOCKED',
      detail: 'Demasiados intentos fallidos. Volvé a probar en 5 minutos.',
    });
    renderPage();
    await submit();
    expect(await screen.findByText(/volvé a probar en 5 minutos/i)).toBeInTheDocument();
  });

  it('sin motivo del servidor cae al mensaje de siempre', async () => {
    auth.login.mockRejectedValue({ status: 401, code: 'UNAUTHORIZED' });
    renderPage();
    await submit();
    expect(await screen.findByText(/credenciales incorrectas/i)).toBeInTheDocument();
  });
});
