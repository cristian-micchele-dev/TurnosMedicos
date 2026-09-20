import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientForm } from './PatientForm';
import type { Patient } from '../../api/patients';

describe('PatientForm', () => {
  const setup = (patient?: Patient) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    render(<PatientForm patient={patient} onSubmit={onSubmit} onCancel={onCancel} />);
    return { onSubmit, onCancel };
  };

  it('no pide usuario ni contraseña: el paciente es un registro, no una cuenta', () => {
    setup();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/usuario existente/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
  });

  it('exige nombre y no envía nada si falta', async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole('button', { name: /crear paciente/i }));
    expect(await screen.findByText(/ingresá el nombre completo/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida el formato del email cuando se completa', async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText(/nombre completo/i), 'Ana Pérez');
    await userEvent.type(screen.getByLabelText(/email/i), 'no-es-un-email');
    await userEvent.click(screen.getByRole('button', { name: /crear paciente/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía el payload recortado y omite los campos vacíos', async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByLabelText(/nombre completo/i), '  Ana Pérez  ');
    await userEvent.type(screen.getByLabelText(/teléfono/i), '1155667788');
    await userEvent.click(screen.getByRole('button', { name: /crear paciente/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: undefined,
      phone: '1155667788',
      dateOfBirth: undefined,
      address: undefined,
      insuranceNumber: undefined,
      notes: undefined,
    });
  });

  it('en edición precarga los datos y cambia la etiqueta del botón', () => {
    setup({
      id: 'p1', name: 'Emanuel', email: 'ema@test.com', phone: '123', dateOfBirth: '1994-01-01',
      address: null, insuranceNumber: 'OSDE 1', notes: null, active: true,
    });
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue('Emanuel');
    expect(screen.getByLabelText(/email/i)).toHaveValue('ema@test.com');
    expect(screen.getByLabelText(/obra social/i)).toHaveValue('OSDE 1');
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it('cancelar llama a onCancel sin enviar', async () => {
    const { onSubmit, onCancel } = setup();
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
