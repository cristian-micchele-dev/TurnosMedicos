import { useEffect, useState } from 'react';

// Emits `value` only once it has stayed unchanged for `delayMs`. For search boxes:
// one request per pause in typing, not one per keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
