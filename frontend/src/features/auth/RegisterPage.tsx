import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!name.trim()) {
      next.name = 'El nombre es requerido.';
    }
    if (!email.trim()) {
      next.email = 'El email es requerido.';
    }
    if (password.length < 6) {
      next.password = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (password !== confirmPassword) {
      next.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(email, password, name);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear la cuenta. Intentá de nuevo.';
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} role="main">
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="var(--primary)" />
              <path
                d="M18 8v20M8 18h20"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className={styles.appName}>TurnoMed</h1>
          <p className={styles.subtitle}>Creá tu cuenta para comenzar</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Nombre completo"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            autoComplete="name"
            autoFocus
            required
            error={errors.name}
          />

          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
            error={errors.email}
          />

          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
            error={errors.password}
            helperText={!errors.password ? 'Mínimo 6 caracteres' : undefined}
          />

          <Input
            label="Confirmar contraseña"
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />

          {apiError && (
            <div className={styles.errorBanner} role="alert" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {apiError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className={styles.submitBtn}
          >
            Crear Cuenta
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.loginText}>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className={styles.linkPrimary}>
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
