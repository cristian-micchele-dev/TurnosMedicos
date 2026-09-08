import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

describe('useFetch', () => {
  it('starts with loading=true and no data', () => {
    const fetcher = () => new Promise<string>(() => {}); // never resolves
    const { result } = renderHook(() => useFetch(fetcher));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('sets data and loading=false after resolve', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.error).toBeUndefined();
  });

  it('sets error and loading=false on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.data).toBeUndefined();
  });

  it('wraps non-Error rejections in an Error', async () => {
    const fetcher = vi.fn().mockRejectedValue('plain string error');
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('plain string error');
  });

  it('refetch() re-runs the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('first');
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    fetcher.mockResolvedValue('second');
    result.current.refetch();

    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when deps change', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    let dep = 1;

    const { result, rerender } = renderHook(() => useFetch(fetcher, [dep]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    dep = 2;
    rerender();

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
