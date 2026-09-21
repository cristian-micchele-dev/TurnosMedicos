import { initialsOf } from '../../utils/initials';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'xl';
}

// Photo when there is one, initials otherwise. The photo carries the person's name
// as alt so screen readers and tests can find "the image of Laura".
export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <span className={[styles.avatar, styles[size]].join(' ')} aria-hidden={src ? undefined : true}>
      {src ? <img className={styles.img} src={src} alt={name} /> : initialsOf(name)}
    </span>
  );
}
