import { useQuery } from '@tanstack/react-query';
import { ImageInfo } from '../../types';

interface UseImageQueryOptions {
  enabled?: boolean;
}

async function fetchImages(): Promise<ImageInfo[]> {
  const response = await fetch('/api/images');
  if (!response.ok) {
    throw new Error('Failed to fetch images');
  }
  return response.json();
}

export function useImageQuery(options: UseImageQueryOptions = {}) {
  return useQuery({
    queryKey: ['images'],
    queryFn: fetchImages,
    enabled: options.enabled,
    select: (data: ImageInfo[]) => ({
      images: data,
      isLoading: false,
      error: null,
    }),
    throwOnError: false,
  });
}
