import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve el valor inicial de inmediato y el nuevo recién después del retardo', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('reinicia el retardo con cada cambio: solo emite el último valor', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: '' } });
    rerender({ v: 'p' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 'pe' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('pe');
  });
});
