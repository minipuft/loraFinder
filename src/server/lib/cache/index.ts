import { createLruCacheProvider, LruCacheOptions } from './providers/lruCache';
import type { CacheProvider } from './types';

// Currently only supports LRU, but could be extended
export function createCacheProvider<T extends {}>(
  type: 'lru',
  options: LruCacheOptions
): CacheProvider<T> {
  switch (type) {
    case 'lru':
      return createLruCacheProvider<T>(options);
    // Add other types like 'memory', 'redis' etc. here later
    default:
      throw new Error(`Unsupported cache provider type: ${type}`);
  }
}
