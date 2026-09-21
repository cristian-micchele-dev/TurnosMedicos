import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from './Table';

type Row = { id: string; name: string; age: number };
const rows: Row[] = [
  { id: '1', name: 'Carla', age: 40 },
  { id: '2', name: 'Ana', age: 25 },
  { id: '3', name: 'Bruno', age: 33 },
];
const columns = [
  { key: 'name', header: 'Nombre', sortable: true },
  { key: 'age', header: 'Edad', sortable: true, sortValue: (r: Row) => r.age },
];
const keyExtractor = (r: Row) => r.id;

const bodyNames = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row').map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('Table', () => {
  it('ordena ascendente al clickear un encabezado sortable y alterna a descendente', async () => {
    render(<Table columns={columns} data={rows} keyExtractor={keyExtractor} />);
    expect(bodyNames()).toEqual(['Carla', 'Ana', 'Bruno']);

    await userEvent.click(screen.getByRole('button', { name: /nombre/i }));
    expect(bodyNames()).toEqual(['Ana', 'Bruno', 'Carla']);
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute('aria-sort', 'ascending');

    await userEvent.click(screen.getByRole('button', { name: /nombre/i }));
    expect(bodyNames()).toEqual(['Carla', 'Bruno', 'Ana']);
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('usa sortValue para columnas no textuales', async () => {
    render(<Table columns={columns} data={rows} keyExtractor={keyExtractor} />);
    await userEvent.click(screen.getByRole('button', { name: /edad/i }));
    expect(bodyNames()).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('un encabezado no sortable no es un botón', () => {
    render(<Table columns={[{ key: 'name', header: 'Nombre' }]} data={rows} keyExtractor={keyExtractor} />);
    expect(screen.queryByRole('button', { name: /nombre/i })).not.toBeInTheDocument();
  });

  it('empty state muestra título, descripción y acción', async () => {
    const onClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={keyExtractor}
        empty={{ title: 'Sin pacientes', description: 'Cargá el primero para empezar.', action: { label: '+ Nuevo paciente', onClick } }}
      />,
    );
    expect(screen.getByText('Sin pacientes')).toBeInTheDocument();
    expect(screen.getByText('Cargá el primero para empezar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nuevo paciente' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('con búsqueda activa y sin resultados muestra el mensaje de filtro, no el de vacío', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={keyExtractor}
        empty={{ title: 'Sin pacientes', action: { label: '+ Nuevo', onClick: vi.fn() } }}
        filtered
      />,
    );
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
    expect(screen.queryByText('Sin pacientes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nuevo' })).not.toBeInTheDocument();
  });

  it('las columnas hideUntilHover marcan la celda para revelarla al hover/focus', () => {
    render(
      <Table
        columns={[{ key: 'name', header: 'Nombre' }, { key: 'actions', header: 'Acciones', hideUntilHover: true, render: () => <button>Editar</button> }]}
        data={rows}
        keyExtractor={keyExtractor}
      />,
    );
    const cell = screen.getAllByRole('button', { name: 'Editar' })[0].closest('td');
    expect(cell).toHaveClass('tdHover');
  });

  it('muestra el resumen "Mostrando X–Y de Z" cuando se pasa total', () => {
    render(<Table columns={columns} data={rows} keyExtractor={keyExtractor} total={57} page={2} pageSize={20} />);
    expect(screen.getByText('Mostrando 21–23 de 57')).toBeInTheDocument();
  });

  it('en carga muestra filas skeleton y no el empty state', () => {
    render(<Table columns={columns} data={[]} keyExtractor={keyExtractor} loading empty={{ title: 'Sin datos' }} />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Sin datos')).not.toBeInTheDocument();
  });
});
