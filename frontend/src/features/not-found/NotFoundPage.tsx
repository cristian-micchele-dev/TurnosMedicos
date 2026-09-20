import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 className={styles.heading}>Página no encontrada</h1>
        <p className={styles.description}>
          La página que buscás no existe o fue movida.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Volver al inicio</Button>
      </div>
    </div>
  );
}
