import { render, screen } from '@testing-library/react';
import { Input } from './Input';
import { Select } from './Select';

describe('required marker', () => {
  it('Input marca el campo requerido en el label sin ensuciar el nombre accesible', () => {
    render(<Input label="Nombre" required />);
    const input = screen.getByLabelText('Nombre');
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('Input sin required no muestra asterisco', () => {
    render(<Input label="Notas" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Notas')).not.toBeRequired();
  });

  it('Select marca el campo requerido', () => {
    render(<Select label="Día" required options={[{ value: '1', label: 'Lunes' }]} value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Día')).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('password visibility toggle', () => {
  it('un password muestra el ojito y alterna entre oculto y visible', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Input label="Contraseña" type="password" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: /mostrar contraseña/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /ocultar contraseña/i })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /ocultar contraseña/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('el ojito no roba el submit del formulario ni el foco del tab', () => {
    render(<Input label="Contraseña" type="password" />);
    const toggle = screen.getByRole('button', { name: /mostrar contraseña/i });
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('tabindex', '-1');
  });

  it('un input de texto no muestra el ojito', () => {
    render(<Input label="Nombre" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
