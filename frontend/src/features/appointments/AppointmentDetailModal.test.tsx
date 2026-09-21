import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import type { Appointment } from '../../api/appointments';

const { auth, doctorsApi, reportsApi, prescriptionsApi } = vi.hoisted(() => ({
  // The account id and the doctor-profile id are different rows on purpose:
  // the modal must compare against the profile, never the account.
  auth: { user: { id: 'user-1', email: 'laura@turno.med', name: 'Laura Gómez', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN', mustChangePassword: false } },
  doctorsApi: { me: vi.fn() },
  reportsApi: { findByAppointment: vi.fn(), upload: vi.fn(), download: vi.fn(), print: vi.fn(), delete: vi.fn() },
  prescriptionsApi: { findByAppointment: vi.fn(), create: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));
vi.mock('../../api/reports', () => ({ reportsApi }));
vi.mock('../../api/prescriptions', () => ({ prescriptionsApi }));
vi.mock('../../api/appointments', () => ({ appointmentsApi: {} }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }) }));

const completed: Appointment = {
  id: 'a1', code: 'TM-00001', doctorId: 'doctor-1', patientId: 'p1', specialtyId: 's1',
  dateTime: '2026-09-21T13:00:00.000Z', durationMinutes: 30, status: 'COMPLETED',
  notes: null, diagnosis: null, cancellationReason: null,
  patient: { id: 'p1', name: 'Emanuel Pérez', email: null },
};

const renderModal = (appointment: Appointment, role: 'DOCTOR' | 'ADMIN' = 'DOCTOR') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <AppointmentDetailModal appointment={appointment} role={role} onClose={() => {}} onAction={async () => {}} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.role = 'DOCTOR';
  doctorsApi.me.mockResolvedValue({ id: 'doctor-1', userId: 'user-1', avatarFile: null });
  reportsApi.findByAppointment.mockResolvedValue([]);
  prescriptionsApi.findByAppointment.mockResolvedValue([]);
});

describe('AppointmentDetailModal — informes y recetas del médico tratante', () => {
  it('el médico dueño de un turno completado puede subir informe y crear receta', async () => {
    renderModal(completed);
    expect(await screen.findByRole('button', { name: /subir informe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva receta/i })).toBeInTheDocument();
  });

  it('otro médico no ve esas acciones aunque el turno esté completado', async () => {
    doctorsApi.me.mockResolvedValue({ id: 'doctor-2', userId: 'user-1', avatarFile: null });
    renderModal(completed);
    await screen.findByText(/informes medicos/i);
    expect(screen.queryByRole('button', { name: /subir informe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nueva receta/i })).not.toBeInTheDocument();
  });

  it('un turno pendiente no admite informes', async () => {
    renderModal({ ...completed, status: 'PENDING' });
    await screen.findByText(/informes medicos/i);
    expect(screen.queryByRole('button', { name: /subir informe/i })).not.toBeInTheDocument();
  });

  it('el médico ve "eliminar" solo en sus propios informes', async () => {
    reportsApi.findByAppointment.mockResolvedValue([
      { id: 'r1', doctorId: 'doctor-1', title: 'Mío', originalName: 'mio.pdf', mimeType: 'application/pdf', sizeBytes: 10, createdAt: '2026-09-21T13:00:00.000Z' },
      { id: 'r2', doctorId: 'doctor-9', title: 'Ajeno', originalName: 'ajeno.pdf', mimeType: 'application/pdf', sizeBytes: 10, createdAt: '2026-09-21T13:00:00.000Z' },
    ]);
    renderModal(completed);
    await screen.findByText('Mío');
    expect(screen.getAllByRole('button', { name: /eliminar/i })).toHaveLength(1);
  });
});
