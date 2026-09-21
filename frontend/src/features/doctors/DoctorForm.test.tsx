import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoctorForm } from './DoctorForm';
import type { Doctor } from '../../api/doctors';
import type { UserListItem } from '../../api/users';

vi.mock('../../api/users', () => ({ usersApi: { create: vi.fn() } }));

const user = (id: string, name: string, role: 'ADMIN' | 'DOCTOR', active = true): UserListItem =>
  ({ id, name, email: `${id}@turno.med`, role, active }) as UserListItem;

const doctorOf = (userId: string): Doctor =>
  ({ id: `doc-${userId}`, userId, specialtyId: 'sp-1', licenseNumber: `MP-${userId}`, active: true }) as Doctor;

describe('DoctorForm — usuario existente', () => {
  const users = [
    user('admin', 'Root Admin', 'ADMIN'),
    user('conperfil', 'Ya Tiene Perfil', 'DOCTOR'),
    user('libre', 'Sin Perfil', 'DOCTOR'),
    user('inactivo', 'Cuenta Inactiva', 'DOCTOR', false),
  ];

  const setup = (doctors: Doctor[]) => {
    render(
      <DoctorForm
        specialties={[{ id: 'sp-1', name: 'Cardiología', description: null, active: true }]}
        users={users}
        doctors={doctors}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />,
    );
  };

  it('solo ofrece cuentas DOCTOR activas que todavía no tienen perfil', async () => {
    setup([doctorOf('conperfil')]);
    await userEvent.click(screen.getByRole('button', { name: /usuario existente/i }));
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.some((t) => t?.includes('Sin Perfil'))).toBe(true);
    expect(options.some((t) => t?.includes('Root Admin'))).toBe(false);
    expect(options.some((t) => t?.includes('Ya Tiene Perfil'))).toBe(false);
    expect(options.some((t) => t?.includes('Cuenta Inactiva'))).toBe(false);
  });

  it('cuando no queda ninguna cuenta libre lo dice y sugiere crear una nueva', async () => {
    setup([doctorOf('conperfil'), doctorOf('libre')]);
    await userEvent.click(screen.getByRole('button', { name: /usuario existente/i }));
    expect(screen.getByText(/no hay cuentas de médico sin perfil/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /usuario/i })).not.toBeInTheDocument();
  });
});
