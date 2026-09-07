import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Cargando...' }: SpinnerProps) {
  return (
    <span
      className={[styles.spinner, styles[size]].join(' ')}
      role="status"
      aria-label={label}
    />
  );
}
