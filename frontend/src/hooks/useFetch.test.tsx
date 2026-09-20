import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFetch } from './useFetch';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 60_000 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useFetch', () => {
  it('starts with loading=true and no data', () => {
    const fetcher = () => new Promise<string>(() => {});
    const { result } = renderHook(() => useFetch(['never'], fetcher), { wrapper: createWrapper() });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('sets data and loading=false after resolve', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useFetch(['ok'], fetcher), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.error).toBeUndefined();
  });

  it('sets error and loading=false on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useFetch(['fail'], fetcher), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.data).toBeUndefined();
  });

  it('wraps non-Error rejections in an Error', async () => {
    const fetcher = vi.fn().mockRejectedValue('plain string error');
    const { result } = renderHook(() => useFetch(['fail-str'], fetcher), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('plain string error');
  });

  it('refetch() re-runs the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('first');
    const { result } = renderHook(() => useFetch(['refetch'], fetcher), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    fetcher.mockResolvedValue('second');
    await result.current.refetch();

    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when the query key changes', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    let page = 1;

    const { result, rerender } = renderHook(() => useFetch(['paged', page], fetcher), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    page = 2;
    rerender();

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('serves cached data for the same key without re-fetching', async () => {
    const fetcher = vi.fn().mockResolvedValue('cached');
    const wrapper = createWrapper();

    const first = renderHook(() => useFetch(['shared'], fetcher), { wrapper });
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    const second = renderHook(() => useFetch(['shared'], fetcher), { wrapper });
    expect(second.result.current.data).toBe('cached');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
