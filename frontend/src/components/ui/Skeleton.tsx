import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  count?: number;
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height = '1rem',
  count = 1,
}: SkeletonProps) {
  const cls = [
    styles.skeleton,
    variant === 'circular' ? styles.circular : '',
  ].join(' ').trim();

  const item = (
    <span
      className={cls}
      style={{ width, height, display: 'block' }}
      aria-hidden="true"
    />
  );

  if (count <= 1) return item;

  return (
    <span className={styles.wrap}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cls}
          style={{ width, height, display: 'block' }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
