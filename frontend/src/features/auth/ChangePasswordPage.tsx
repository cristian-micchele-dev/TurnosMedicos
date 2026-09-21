import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { ApiError } from '../../api/client';
import styles from './ChangePasswordPage.module.css';

const MIN_LENGTH = 8;

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ next?: string; confirm?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const forced = Boolean(user?.mustChangePassword);

  const validate = () => {
    const e: typeof errors = {};
    if (next.length < MIN_LENGTH) e.next = `Usá al menos ${MIN_LENGTH} caracteres`;
    else if (next === current) e.next = 'Tiene que ser distinta a la actual';
    if (confirm !== next) e.confirm = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await changePassword(current, next);
      toast.success('Contraseña actualizada');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErr = err as Partial<ApiError>;
      setErrors({ form: apiErr.detail ?? 'No pudimos cambiar la contraseña. Revisá la actual e intentá de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true"><KeyRound size={22} /></div>
        <h1 className={styles.title}>{forced ? 'Elegí tu contraseña' : 'Cambiar contraseña'}</h1>
        <p className={styles.subtitle}>
          {forced
            ? 'Entraste con una clave temporal. Definí una propia para seguir usando el sistema.'
            : 'Ingresá tu contraseña actual y la nueva.'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label={forced ? 'Contraseña temporal' : 'Contraseña actual'}
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
          <Input
            label="Nueva contraseña"
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => { setNext(e.target.value); if (errors.next) setErrors((p) => ({ ...p, next: undefined })); }}
            error={errors.next}
            helperText={`Mínimo ${MIN_LENGTH} caracteres`}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirmar nueva contraseña"
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined })); }}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />

          {errors.form && (
            <div className={styles.errorBanner} role="alert" aria-live="polite">{errors.form}</div>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={submitting} className={styles.submitBtn}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
