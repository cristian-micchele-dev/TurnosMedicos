import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChangePasswordPage } from './ChangePasswordPage';

const { navigate, toast, auth } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  auth: {
    user: { id: 'u1', email: 'd@h.com', name: 'Dan', role: 'DOCTOR' as const, mustChangePassword: true },
    changePassword: vi.fn(),
  },
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

const renderPage = () => render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
const fill = async (current: string, next: string, confirm: string) => {
  await userEvent.type(screen.getByLabelText(/contraseña (actual|temporal)/i), current);
  await userEvent.type(screen.getByLabelText(/^nueva contraseña/i), next);
  await userEvent.type(screen.getByLabelText(/confirmar/i), confirm);
  await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
};

beforeEach(() => { vi.clearAllMocks(); auth.user.mustChangePassword = true; auth.changePassword.mockResolvedValue(undefined); });

describe('ChangePasswordPage', () => {
  it('explica que la clave es temporal cuando mustChangePassword está activo', () => {
    renderPage();
    expect(screen.getByText(/entraste con una clave temporal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña temporal/i)).toBeInTheDocument();
  });

  it('exige la longitud mínima y que la confirmación coincida', async () => {
    renderPage();
    await fill('temp1234', 'corta', 'corta');
    expect(await screen.findByText(/al menos 10/i)).toBeInTheDocument();
    expect(auth.changePassword).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText(/^nueva contraseña/i));
    await userEvent.clear(screen.getByLabelText(/confirmar/i));
    await userEvent.type(screen.getByLabelText(/^nueva contraseña/i), 'clave-larga-1');
    await userEvent.type(screen.getByLabelText(/confirmar/i), 'clave-larga-2');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('envía actual + nueva y navega al dashboard', async () => {
    renderPage();
    await fill('temp1234', 'clave-definitiva', 'clave-definitiva');
    await waitFor(() => expect(auth.changePassword).toHaveBeenCalledWith('temp1234', 'clave-definitiva'));
    expect(toast.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('muestra el error del backend sin navegar', async () => {
    auth.changePassword.mockRejectedValue({ status: 401, title: 'UNAUTHORIZED', detail: 'Credenciales inválidas' });
    renderPage();
    await fill('wrong', 'clave-definitiva', 'clave-definitiva');
    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
