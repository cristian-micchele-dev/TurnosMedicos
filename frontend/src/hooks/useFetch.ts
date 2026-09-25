import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export type QueryKey = readonly unknown[];

export interface FetchOptions {
  /** Milliseconds between automatic refreshes. Off by default: most screens are read once. */
  refetchInterval?: number;
  /** Refresh when the tab regains focus. Off by default (see lib/queryClient). */
  refetchOnWindowFocus?: boolean;
  /** How long the cached value is considered fresh; overrides the global 60s. */
  staleTime?: number;
}

export function useFetch<T>(queryKey: QueryKey, fetcher: () => Promise<T>, options: FetchOptions = {}) {
  const queryClient = useQueryClient();

  // El rechazo pasa tal cual. El cliente HTTP rechaza con un ApiError —un objeto
  // plano con status, code y detail—, así que envolverlo en `new Error(String(e))`
  // lo convertía literalmente en "[object Object]" y el motivo se perdía antes de
  // llegar a la pantalla.
  const query = useQuery<T, unknown>({ queryKey, queryFn: fetcher, ...options });

  // Invalidates every query sharing the resource prefix (queryKey[0]),
  // so a mutation on one page refreshes the same resource on any other page.
  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [queryKey[0]] }),
    [queryClient, queryKey[0]],
  );

  return {
    data: query.data,
    loading: query.isPending,
    error: query.error ?? undefined,
    refetch,
  };
}
