import { Navigate, useLocation } from 'react-router-dom';

/**
 * Manda una ruta vieja a la nueva sin perder los filtros.
 *
 * Una URL que alguien guardó en favoritos, pegó en un mensaje o dejó en una card
 * del dashboard sigue significando lo mismo. `replace` para que el botón "atrás"
 * no te devuelva a la ruta que acabás de abandonar.
 */
export function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}
