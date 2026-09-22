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

  const query = useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await fetcher();
      } catch (e) {
        throw e instanceof Error ? e : new Error(String(e));
      }
    },
    ...options,
  });

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
