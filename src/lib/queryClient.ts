import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { QueryClient } from '@tanstack/react-query';
import { createIDBPersister } from './queryClient/idbPersister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // Cache persists for 24 hours (aligned with maxAge)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 2, // Retry failed requests twice
      refetchOnMount: true, // Refetch on component mount if data is stale
    },
  },
});

// Create the persister instance
const persister = createIDBPersister();

// Set up persistence
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // Max cache age: 24 hours (aligned with gcTime)
  // Optional: Add a buster string for manual cache invalidation
  // buster: process.env.APP_VERSION || 'v1',
});
