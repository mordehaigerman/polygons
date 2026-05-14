/**
 * QueryClient factory.
 *
 * Tuned for the 5-second artificial backend delay: short retry
 * budget, no refetch-on-focus, mutations never auto-retry (to avoid duplicate
 * creates on flaky networks).
 */

import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });

export const polygonsQueryKey = ['polygons'] as const;
