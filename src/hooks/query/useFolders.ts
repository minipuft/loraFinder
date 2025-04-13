import { useQuery } from '@tanstack/react-query';
import { getFolders } from '../../lib/api';
import { FolderInfo } from '../../types';

/**
 * Custom hook to fetch the list of available folders using React Query.
 *
 * @returns The result object from useQuery, containing folder data, loading state, error state, etc.
 */
export function useFolders() {
  return useQuery<FolderInfo[], Error>({
    // Query key: uniquely identifies this query data.
    // Stays constant as we expect the same folder list unless invalidated.
    queryKey: ['folders'],
    // Query function: the async function that fetches the data.
    queryFn: getFolders,
    // Optional: Configure staleTime and gcTime if different from defaults
    // staleTime: 1000 * 60 * 10, // e.g., folders stay fresh for 10 mins
  });
}
