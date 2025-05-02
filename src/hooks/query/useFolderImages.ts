import { useSuspenseQuery } from '@tanstack/react-query';
import { getImages } from '../../lib/api';
import { ImageInfo } from '../../types';

/**
 * Custom hook to fetch images for a specific folder using React Query.
 *
 * @param {string} folder - The name of the folder to fetch images from.
 * @returns The result object from useQuery, containing image data, loading state, error state, etc.
 */
export function useFolderImages(folder: string) {
  return useSuspenseQuery<ImageInfo[], Error>({
    // Query key: uniquely identifies this query data.
    // Includes the folder name so data is cached per folder.
    queryKey: ['images', folder],
    // Query function: the async function that fetches the data.
    queryFn: () => getImages(folder),
    // Enabled option: prevents the query from running if the folder is falsy (e.g., empty string, null, undefined).
    // Note: `enabled` is not typically used with `useSuspenseQuery` as it expects the query to always run when mounted.
    // If the query shouldn't run, the component using the hook should conditionally render.
    // We'll keep the logic outside the hook for now, assuming the component handles the `folder` check.
    // enabled: !!folder, // <-- Removed as it conflicts with Suspense Query expectation
  });
}
