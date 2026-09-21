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
