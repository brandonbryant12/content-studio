import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 1 minute - prevents unnecessary refetches
      staleTime: 1000 * 60,
      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5,
    },
  },
});
