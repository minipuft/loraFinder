import { CACHE_TTL } from '../utils/constants.js';
import { ImageInfo } from '../types.js';

// Define the structure of a cache item
interface CacheItem {
  data: ImageInfo[];
  expiry: number;
}

// Initialize the cache object
const cache: { [key: string]: CacheItem } = {};

// Set the maximum number of items in the cache
const MAX_CACHE_SIZE = 100; // Adjust as needed

// Function to remove the oldest item when cache exceeds maximum size
function trimCache() {
  const cacheKeys = Object.keys(cache);
  if (cacheKeys.length > MAX_CACHE_SIZE) {
    const oldestKey = cacheKeys.reduce((a, b) => (cache[a].expiry < cache[b].expiry ? a : b));
    delete cache[oldestKey];
  }
}

// Function to retrieve cached images for a specific folder
export function getCachedImages(folder: string): ImageInfo[] | undefined {
  const item = cache[folder];
  if (item && Date.now() < item.expiry) {
    return item.data;
  }
  return undefined;
}

// Function to store images in the cache for a specific folder
export function setCachedImages(folder: string, images: ImageInfo[]): void {
  cache[folder] = {
    data: images,
    expiry: Date.now() + CACHE_TTL,
  };
  trimCache();
}

// Function to remove a specific folder from the cache
export function invalidateCache(folder: string): void {
  delete cache[folder];
}
