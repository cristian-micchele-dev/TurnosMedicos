import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RedirectKeepingQuery } from './RedirectKeepingQuery';

function Destino() {
  const { pathname, search } = useLocation();
  return <output data-testid="destino">{pathname + search}</output>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/viejo" element={<RedirectKeepingQuery to="/nuevo" />} />
        <Route path="/nuevo" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );

describe('RedirectKeepingQuery', () => {
  it('lleva a la ruta nueva', () => {
    renderAt('/viejo');
    expect(screen.getByTestId('destino')).toHaveTextContent('/nuevo');
  });

  it('se lleva los filtros puestos: un link viejo con query sigue significando lo mismo', () => {
    renderAt('/viejo?status=PENDING&page=2');
    expect(screen.getByTestId('destino')).toHaveTextContent('/nuevo?status=PENDING&page=2');
  });
});
