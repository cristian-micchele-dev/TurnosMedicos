import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewAppointmentPage } from './NewAppointmentPage';
import { localDateTimeToIso } from '../../utils/date';

const { navigate, toast, auth, doctorsApi, patientsApi, specialtiesApi, appointmentsApi } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  auth: { user: { id: 'u1', email: 'x@y.com', name: 'X', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN' } },
  doctorsApi: { me: vi.fn(), findAll: vi.fn(), getAvailability: vi.fn() },
  patientsApi: { findAll: vi.fn(), create: vi.fn() },
  specialtiesApi: { findAll: vi.fn() },
  appointmentsApi: { findAll: vi.fn(), create: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));
vi.mock('../../api/patients', () => ({ patientsApi }));
vi.mock('../../api/specialties', () => ({ specialtiesApi }));
vi.mock('../../api/appointments', () => ({ appointmentsApi }));

const doctor = { id: 'd1', userId: 'u1', specialtyId: 's1', licenseNumber: 'MP-1', phone: null, active: true, user: { id: 'u1', email: 'x@y.com', name: 'Dra. House' } };
const patient = { id: 'p1', name: 'Ana Pérez', email: 'ana@test.com', phone: null, dateOfBirth: null, address: null, insuranceNumber: null, notes: null, active: true };

// Next Monday on the local clock, so the availability block (dayOfWeek 1) always matches.
function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  doctorsApi.me.mockResolvedValue(doctor);
  doctorsApi.findAll.mockResolvedValue({ data: [doctor], total: 1, page: 1, totalPages: 1 });
  doctorsApi.getAvailability.mockResolvedValue([{ id: 'a1', doctorId: 'd1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', slotDuration: 30 }]);
  patientsApi.findAll.mockResolvedValue({ data: [patient, { ...patient, id: 'p2', name: 'Bruno Díaz', email: 'bruno@test.com', insuranceNumber: 'OSDE 77' }], total: 2, page: 1, totalPages: 1 });
  specialtiesApi.findAll.mockResolvedValue({ data: [{ id: 's1', name: 'Cardiología', description: null, active: true }], total: 1, page: 1, totalPages: 1 });
  appointmentsApi.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
  appointmentsApi.create.mockResolvedValue({ id: 'appt-1' });
  patientsApi.create.mockResolvedValue({ ...patient, id: 'p-new', name: 'Nuevo Walk-in', email: null });
});

const renderPage = () => render(<MemoryRouter><NewAppointmentPage /></MemoryRouter>);

describe('NewAppointmentPage', () => {
  it('DOCTOR: flujo de 3 pasos — su propio perfil se resuelve solo', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    await waitFor(() => expect(doctorsApi.me).toHaveBeenCalled());
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Horario')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.queryByText('Especialidad')).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor')).not.toBeInTheDocument();
  });

  it('ADMIN: flujo de 5 pasos', async () => {
    auth.user.role = 'ADMIN';
    renderPage();
    expect(await screen.findByText('Especialidad')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(doctorsApi.me).not.toHaveBeenCalled();
  });

  it('no avanza sin paciente seleccionado', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });

  it('DOCTOR completa el flujo y envía un instante UTC inequívoco', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();

    await userEvent.click(await screen.findByText('Ana Pérez'));
    await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));

    const dateInput = await screen.findByLabelText(/fecha del turno/i);
    const monday = nextMonday();
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, monday);

    await userEvent.click(await screen.findByRole('button', { name: '09:30' }));
    await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(await screen.findByText('Confirmá el turno')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Dra. House')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirmar turno/i }));

    await waitFor(() => expect(appointmentsApi.create).toHaveBeenCalledTimes(1));
    expect(appointmentsApi.create).toHaveBeenCalledWith({
      doctorId: 'd1',
      patientId: 'p1',
      dateTime: localDateTimeToIso(monday, '09:30'),
    });
    expect(appointmentsApi.create.mock.calls[0][0].dateTime).toMatch(/Z$/);
    expect(navigate).toHaveBeenCalledWith('/mis-turnos');
  });

  it('marca como ocupado un horario ya reservado', async () => {
    auth.user.role = 'DOCTOR';
    const monday = nextMonday();
    appointmentsApi.findAll.mockResolvedValue({
      data: [{ id: 'x', dateTime: localDateTimeToIso(monday, '09:00'), status: 'CONFIRMED' }],
      total: 1, page: 1, totalPages: 1,
    });
    renderPage();
    await userEvent.click(await screen.findByText('Ana Pérez'));
    await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
    const dateInput = await screen.findByLabelText(/fecha del turno/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, monday);

    const booked = await screen.findByRole('button', { name: /09:00/ });
    expect(booked).toBeDisabled();
    expect(screen.getByRole('button', { name: '09:30' })).toBeEnabled();
  });

  it('DOCTOR puede registrar un paciente nuevo sin salir del flujo y queda seleccionado', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    await screen.findByText('Ana Pérez');
    await userEvent.click(screen.getByRole('button', { name: /nuevo paciente/i }));
    await userEvent.type(await screen.findByLabelText(/nombre completo/i), 'Nuevo Walk-in');
    await userEvent.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => expect(patientsApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nuevo Walk-in' })));
    expect(await screen.findByText('Nuevo Walk-in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeEnabled();
  });

  describe('búsqueda de pacientes existentes', () => {
    it('filtra por nombre, email u obra social sin distinguir acentos', async () => {
      auth.user.role = 'DOCTOR';
      renderPage();
      await screen.findByText('Ana Pérez');
      const search = screen.getByRole('searchbox', { name: /buscar paciente/i });
      await userEvent.type(search, 'osde');
      expect(screen.getByText('Bruno Díaz')).toBeInTheDocument();
      expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
      await userEvent.clear(search);
      await userEvent.type(search, 'perez');
      expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
      expect(screen.queryByText('Bruno Díaz')).not.toBeInTheDocument();
    });

    it('si no encuentra a nadie ofrece registrarlo con el nombre ya cargado', async () => {
      auth.user.role = 'DOCTOR';
      renderPage();
      await screen.findByText('Ana Pérez');
      await userEvent.type(screen.getByRole('searchbox', { name: /buscar paciente/i }), 'Zoe Nueva');
      expect(screen.getByText(/no encontramos a/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /registrar a zoe nueva/i }));
      expect(await screen.findByLabelText(/nombre completo/i)).toHaveValue('Zoe Nueva');
    });
  });

  it('pide pacientes dentro del máximo que acepta el backend (100)', async () => {
    auth.user.role = 'DOCTOR';
    renderPage();
    await waitFor(() => expect(patientsApi.findAll).toHaveBeenCalled());
    const [, limit] = patientsApi.findAll.mock.calls[0];
    expect(limit).toBeLessThanOrEqual(100);
  });

  it('si la carga de pacientes falla lo dice y ofrece reintentar, no finge que no hay pacientes', async () => {
    auth.user.role = 'DOCTOR';
    patientsApi.findAll.mockRejectedValueOnce({ status: 400 });
    renderPage();
    expect(await screen.findByText(/no pudimos cargar los pacientes/i)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no hay pacientes/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });
});
