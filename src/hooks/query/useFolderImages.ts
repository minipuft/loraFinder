import { useQuery } from '@tanstack/react-query';
import { getImages } from '../../lib/api';
import { ImageInfo } from '../../types';

/**
 * Custom hook to fetch images for a specific folder using React Query.
 *
 * @param {string} folder - The name of the folder to fetch images from.
 * @returns The result object from useQuery, containing image data, loading state, error state, etc.
 */
export function useFolderImages(folder: string) {
  return useQuery<ImageInfo[], Error>({
    // Query key: uniquely identifies this query data.
    // Includes the folder name so data is cached per folder.
    queryKey: ['images', folder],
    // Query function: the async function that fetches the data.
    queryFn: () => getImages(folder),
    // Enabled option: prevents the query from running if the folder is falsy (e.g., empty string, null, undefined).
    enabled: !!folder,
    // Use placeholderData to keep displaying the previous data while the new data is loading.
    placeholderData: previousData => previousData,
  });
}
