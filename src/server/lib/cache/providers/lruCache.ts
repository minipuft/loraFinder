import { LRUCache } from 'lru-cache';
import type { CacheProvider } from '../types';

export interface LruCacheOptions {
  maxItems: number;
  ttlMs: number;
}

/**
 * Creates a cache provider backed by an in-memory LRU cache.
 * @param opts Configuration options for the LRU cache.
 * @returns An instance of CacheProvider.
 */
export function createLruCacheProvider<T extends {}>(opts: LruCacheOptions): CacheProvider<T> {
  const lru = new LRUCache<string, T>({
    max: opts.maxItems,
    ttl: opts.ttlMs,
  });

  return {
    async get(key: string): Promise<T | undefined> {
      return lru.get(key);
    },
    async set(key: string, value: T): Promise<void> {
      lru.set(key, value);
    },
    async delete(key: string): Promise<boolean> {
      const exists = lru.has(key);
      if (exists) {
        lru.delete(key);
      }
      return exists;
    },
    async clear(): Promise<void> {
      lru.clear();
    },
  };
}
