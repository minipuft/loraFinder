interface CacheItem {
  data: any;
  expiry: number;
}

const cache: { [key: string]: CacheItem } = {};
const TTL = 600000; // 10 minutes in milliseconds

export function getCachedImages(folder: string): any | undefined {
  const item = cache[folder];
  if (item && Date.now() < item.expiry) {
    return item.data;
  }
  return undefined;
}

export function setCachedImages(folder: string, images: any): void {
  cache[folder] = {
    data: images,
    expiry: Date.now() + TTL
  };
}