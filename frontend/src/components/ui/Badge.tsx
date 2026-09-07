import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  children: ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ variant, children, size = 'md' }: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], styles[size]]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
