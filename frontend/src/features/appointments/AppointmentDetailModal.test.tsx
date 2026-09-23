import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import type { Appointment } from '../../api/appointments';

const { auth, doctorsApi, reportsApi, prescriptionsApi, commentsApi } = vi.hoisted(() => ({
  // The account id and the doctor-profile id are different rows on purpose:
  // the modal must compare against the profile, never the account.
  auth: { user: { id: 'user-1', email: 'laura@turno.med', name: 'Laura Gómez', role: 'DOCTOR' as 'DOCTOR' | 'ADMIN' | 'SECRETARY', mustChangePassword: false } },
  doctorsApi: { me: vi.fn() },
  reportsApi: { findByAppointment: vi.fn(), upload: vi.fn(), download: vi.fn(), print: vi.fn(), delete: vi.fn() },
  prescriptionsApi: { findByAppointment: vi.fn(), create: vi.fn() },
  commentsApi: { list: vi.fn(), add: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/doctors', () => ({ doctorsApi }));
vi.mock('../../api/reports', () => ({ reportsApi }));
vi.mock('../../api/prescriptions', () => ({ prescriptionsApi }));
vi.mock('../../api/comments', () => ({ commentsApi, MAX_COMMENT_LENGTH: 500 }));
vi.mock('../../api/appointments', () => ({ appointmentsApi: {} }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }) }));

const completed: Appointment = {
  id: 'a1', code: 'TM-00001', doctorId: 'doctor-1', patientId: 'p1', specialtyId: 's1',
  dateTime: '2026-09-21T13:00:00.000Z', durationMinutes: 30, status: 'COMPLETED',
  notes: null, diagnosis: null, cancellationReason: null,
  patient: { id: 'p1', name: 'Emanuel Pérez', email: null },
};

const renderModal = (appointment: Appointment, role: 'DOCTOR' | 'ADMIN' | 'SECRETARY' = 'DOCTOR') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AppointmentDetailModal appointment={appointment} role={role} onClose={() => {}} onAction={async () => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.role = 'DOCTOR';
  doctorsApi.me.mockResolvedValue({ id: 'doctor-1', userId: 'user-1', avatarFile: null });
  reportsApi.findByAppointment.mockResolvedValue([]);
  prescriptionsApi.findByAppointment.mockResolvedValue([]);
  commentsApi.list.mockResolvedValue([]);
  commentsApi.add.mockResolvedValue({ id: 'c9', appointmentId: 'a1', body: 'nuevo', createdAt: '2026-09-23T10:00:00.000Z', author: { id: 'u1', name: 'Yo', role: 'DOCTOR' } });
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

describe('AppointmentDetailModal — la secretaria no ve la historia clínica', () => {
  it('no muestra diagnóstico, informes ni recetas, y ni siquiera los pide', async () => {
    auth.user.role = 'SECRETARY';
    renderModal({ ...completed, diagnosis: 'Hipertensión arterial' }, 'SECRETARY');
    await screen.findByText('TM-00001');
    expect(screen.queryByText(/informes medicos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recetas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hipertensión/i)).not.toBeInTheDocument();
    expect(reportsApi.findByAppointment).not.toHaveBeenCalled();
    expect(prescriptionsApi.findByAppointment).not.toHaveBeenCalled();
  });

  it('sí puede reprogramar y cancelar, pero no marcar el turno como atendido', async () => {
    auth.user.role = 'SECRETARY';
    renderModal({ ...completed, status: 'CONFIRMED' }, 'SECRETARY');
    await screen.findByText('TM-00001');
    expect(screen.getByRole('button', { name: /reprogramar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar turno/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /completar/i })).not.toBeInTheDocument();
  });
});

describe('AppointmentDetailModal — notas del turno', () => {
  const thread = [
    { id: 'c1', appointmentId: 'a1', body: '¿Lo puedo mover media hora?', createdAt: '2026-09-23T12:00:00.000Z', author: { id: 'u-sec', name: 'Marta Recepción', role: 'SECRETARY' } },
    { id: 'c2', appointmentId: 'a1', body: 'Dale, movelo', createdAt: '2026-09-23T12:05:00.000Z', author: { id: 'u-doc', name: 'Laura Gómez', role: 'DOCTOR' } },
  ];

  it('la secretaria SÍ ve las notas aunque no vea la historia clínica: para eso existen', async () => {
    auth.user.role = 'SECRETARY';
    commentsApi.list.mockResolvedValue(thread);
    renderModal(completed, 'SECRETARY');
    expect(await screen.findByText('¿Lo puedo mover media hora?')).toBeInTheDocument();
    expect(screen.getByText('Marta Recepción')).toBeInTheDocument();
    expect(screen.queryByText(/informes medicos/i)).not.toBeInTheDocument();
  });

  it('avisa que no es el lugar para información clínica', async () => {
    commentsApi.list.mockResolvedValue(thread);
    renderModal(completed);
    expect(await screen.findByText(/no escribas información clínica/i)).toBeInTheDocument();
  });

  it('agregar una nota la envía y limpia el campo', async () => {
    renderModal(completed);
    const box = await screen.findByLabelText(/escribir una nota/i);
    await userEvent.type(box, 'Llega 10 minutos tarde');
    await userEvent.click(screen.getByRole('button', { name: /agregar nota/i }));
    await waitFor(() => expect(commentsApi.add).toHaveBeenCalledWith('a1', 'Llega 10 minutos tarde'));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('no agrega una nota vacía', async () => {
    renderModal(completed);
    await screen.findByLabelText(/escribir una nota/i);
    await userEvent.click(screen.getByRole('button', { name: /agregar nota/i }));
    expect(commentsApi.add).not.toHaveBeenCalled();
  });

  it('sin notas explica para qué sirven, en vez de mostrar un vacío', async () => {
    renderModal(completed);
    expect(await screen.findByText(/sin notas/i)).toBeInTheDocument();
  });
});
