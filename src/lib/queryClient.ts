import { QueryClient } from '@tanstack/react-query';

// Cache configuration constants
const STALE_TIME = {
  SHORT: 1000 * 60 * 1,      // 1 minute - for frequently changing data (likes, comments)
  MEDIUM: 1000 * 60 * 5,     // 5 minutes - for songs, artists lists
  LONG: 1000 * 60 * 15,      // 15 minutes - for genres, static data
};

const GC_TIME = 1000 * 60 * 30; // 30 minutes - how long to keep unused data in cache

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: STALE_TIME.MEDIUM,
      gcTime: GC_TIME,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Export stale time constants for use in hooks
export { STALE_TIME };
