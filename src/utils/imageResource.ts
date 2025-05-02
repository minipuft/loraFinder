// src/utils/imageResource.ts

// Define the possible statuses for our resource cache entry
type ResourceStatus = 'pending' | 'resolved' | 'rejected';

// Define the structure for each cache entry
interface ImageCacheEntry {
  status: ResourceStatus;
  promise: Promise<void>;
  error?: any; // Store error if rejected
}

// Cache to store image loading promises and their status
const imageCache = new Map<string, ImageCacheEntry>();

/**
 * Reads an image resource for Suspense.
 * Initiates loading if not started, throws promise if pending, throws error if rejected.
 * @param src The image source URL.
 */
function readImage(src: string): void {
  let entry = imageCache.get(src);

  if (!entry) {
    // Create a new promise to load the image
    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Update cache entry status on successful load
        if (imageCache.has(src)) {
          imageCache.get(src)!.status = 'resolved';
        }
        resolve();
      };
      img.onerror = (event, source, lineno, colno, error) => {
        // Update cache entry status and store error on failure
        const err = error || new Error(`Image loading failed for ${src}`);
        if (imageCache.has(src)) {
          const failedEntry = imageCache.get(src)!;
          failedEntry.status = 'rejected';
          failedEntry.error = err;
        }
        reject(err);
      };
      img.src = src;
    });

    // Create the initial cache entry
    entry = { status: 'pending', promise, error: undefined };
    imageCache.set(src, entry);
  }

  // Check the status and act accordingly for Suspense
  if (entry.status === 'pending') {
    throw entry.promise; // Suspend rendering
  }

  if (entry.status === 'rejected') {
    throw entry.error; // Throw the captured error
  }

  // If status is 'resolved', do nothing - React will proceed to render the component
}

// Export the resource object
export const imageResource = {
  read: readImage,
};
