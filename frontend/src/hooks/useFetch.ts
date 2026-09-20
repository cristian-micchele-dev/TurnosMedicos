import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export type QueryKey = readonly unknown[];

export function useFetch<T>(queryKey: QueryKey, fetcher: () => Promise<T>) {
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
