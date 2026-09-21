import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfilePage } from './ProfilePage';

const { auth, doctorsApi, toast } = vi.hoisted(() => ({
  auth: { user: { id: 'u1', email: 'laura@turno.med', name: 'Laura Gómez', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  doctorsApi: { me: vi.fn(), uploadAvatar: vi.fn(), removeAvatar: vi.fn(), avatarBlob: vi.fn(), update: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));

const laura = {
  id: 'd1', userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-77777', phone: null, active: true,
  avatarFile: null as string | null, createdAt: '2026-01-10T00:00:00.000Z',
  user: { id: 'u1', email: 'laura@turno.med', name: 'Laura Gómez' },
  specialty: { id: 's1', name: 'Traumatología' },
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ProfilePage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.role = 'DOCTOR';
  doctorsApi.me.mockResolvedValue({ ...laura });
  doctorsApi.avatarBlob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:avatar');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('ProfilePage — ficha del médico', () => {
  it('muestra la ficha: nombre, especialidad, matrícula, email y accesos', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Laura Gómez' })).toBeInTheDocument();
    expect(await screen.findByText('Traumatología')).toBeInTheDocument();
    expect(await screen.findByText('MP-77777')).toBeInTheDocument();
    expect(screen.getByText('laura@turno.med')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mi disponibilidad/i })).toHaveAttribute('href', '/disponibilidad');
    expect(screen.getByRole('link', { name: /cambiar contraseña/i })).toHaveAttribute('href', '/cambiar-contrasena');
  });

  it('sin foto muestra las iniciales y ofrece subir una', async () => {
    renderPage();
    expect(await screen.findByText('LG')).toBeInTheDocument();
    expect(await screen.findByLabelText(/subir foto/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quitar foto/i })).not.toBeInTheDocument();
  });

  it('sube la foto elegida y refresca la ficha', async () => {
    doctorsApi.uploadAvatar.mockResolvedValue({ ...laura, avatarFile: 'abc.png' });
    renderPage();
    const input = await screen.findByLabelText(/subir foto/i);
    const file = new File(['img'], 'yo.png', { type: 'image/png' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(doctorsApi.uploadAvatar).toHaveBeenCalledWith('d1', file));
    expect(toast.success).toHaveBeenCalled();
  });

  it('con foto la muestra y permite quitarla', async () => {
    doctorsApi.me.mockResolvedValue({ ...laura, avatarFile: 'abc.png' });
    doctorsApi.removeAvatar.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByRole('img', { name: /laura gómez/i })).toHaveAttribute('src', 'blob:avatar');
    await userEvent.click(screen.getByRole('button', { name: /quitar foto/i }));
    await waitFor(() => expect(doctorsApi.removeAvatar).toHaveBeenCalledWith('d1'));
  });

  it('rechaza en el cliente un archivo que no es imagen, sin llamar a la API', async () => {
    renderPage();
    const input = await screen.findByLabelText(/subir foto/i);
    await userEvent.upload(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }), { applyAccept: false });
    expect(doctorsApi.uploadAvatar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/jpg, png o webp/i));
  });

  it('edita el teléfono en línea', async () => {
    doctorsApi.update.mockResolvedValue({ ...laura, phone: '1155667788' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar teléfono/i }));
    await userEvent.type(screen.getByLabelText(/teléfono/i), '1155667788');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(doctorsApi.update).toHaveBeenCalledWith('d1', { phone: '1155667788' }));
  });
});

describe('ProfilePage — administrador', () => {
  it('muestra la cuenta sin foto ni datos médicos', async () => {
    auth.user.role = 'ADMIN';
    auth.user.name = 'Root Admin';
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Root Admin' })).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(doctorsApi.me).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/subir foto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/matrícula/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cambiar contraseña/i })).toBeInTheDocument();
    auth.user.name = 'Laura Gómez';
  });
});
