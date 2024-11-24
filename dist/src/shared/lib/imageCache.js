import { CACHE_TTL } from "../../shared/constants.js";
// Initialize the cache object
const cache = {};
// Set the maximum number of items in the cache
const MAX_CACHE_SIZE = 100; // Adjust as needed
// Function to remove the oldest item when cache exceeds maximum size
function trimCache() {
    const cacheKeys = Object.keys(cache);
    if (cacheKeys.length > MAX_CACHE_SIZE) {
        const oldestKey = cacheKeys.reduce((a, b) => cache[a].expiry < cache[b].expiry ? a : b);
        delete cache[oldestKey];
    }
}
// Function to retrieve cached images for a specific folder
export function getCachedImages(folder) {
    const item = cache[folder];
    if (item && Date.now() < item.expiry) {
        return item.data;
    }
    return undefined;
}
// Function to store images in the cache for a specific folder
export function setCachedImages(folder, images) {
    cache[folder] = {
        data: images,
        expiry: Date.now() + CACHE_TTL,
    };
    trimCache();
}
// Function to remove a specific folder from the cache
export function invalidateCache(folder) {
    delete cache[folder];
}
// Function to check if an image is cached in a folder
export function isCached(folder, imageId) {
    const cachedImages = getCachedImages(folder);
    return cachedImages ? cachedImages.some((img) => img.id === imageId) : false;
}
//# sourceMappingURL=imageCache.js.map