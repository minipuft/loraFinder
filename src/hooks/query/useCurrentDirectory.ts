import { useQuery } from '@tanstack/react-query';
import { getCurrentDirectory } from '../../lib/api';

/**
 * Custom hook to fetch the current base directory from the server.
 *
 * @returns The result object from useQuery, containing the directory path string, loading state, error state, etc.
 */
export function useCurrentDirectory() {
  return useQuery<string, Error>({
    // Query key: uniquely identifies this query data.
    queryKey: ['currentDirectory'],
    // Query function: the async function that fetches the data.
    queryFn: getCurrentDirectory,
    // Optional: Consider a longer staleTime as this might not change often
    staleTime: 1000 * 60 * 30, // e.g., stays fresh for 30 minutes
    refetchOnWindowFocus: false, // Likely doesn't need to refetch on focus
  });
}
