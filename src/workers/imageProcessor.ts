import * as Comlink from 'comlink'; // Import Comlink namespace for releaseProxy
import { Remote, wrap } from 'comlink'; // Import wrap, Remote, and releaseProxy
import { IDBPDatabase, openDB } from 'idb';
import PQueue from 'p-queue'; // Import p-queue
import { ImageInfo, ImageProcessorWorkerAPI, ProcessedImageCacheEntry } from '../types/index.js'; // Import the API type
// Import the context update type
import { ProcessedImageUpdate } from '../contexts/ImageProcessingContext';

// Remove the message interface - no longer needed
// interface ImageProcessorMessage { ... }

const DB_NAME = 'image-processor-cache';
const STORE_NAME = 'processed-images';
const DB_VERSION = 1;

interface ImageProcessorOptions {
  onImageProcessed?: (
    id: string,
    quality: 'low' | 'high',
    imageUrl: string,
    width: number,
    height: number
  ) => void;
  onError?: (id: string, error: string) => void;
  concurrency?: number; // Allow overriding concurrency
}

// --- Cache Management ---
let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

class ImageProcessor {
  private worker: Worker;
  private proxy: Remote<ImageProcessorWorkerAPI>; // Store the Comlink proxy
  private queue: PQueue; // Add queue instance
  private onError?: (id: string, error: string) => void;
  // Store AbortControllers for active requests
  private activeRequests = new Map<string, AbortController>();
  // Add property to hold the publisher function
  private publisher: ((data: ProcessedImageUpdate) => void) | null = null;

  constructor(options?: ImageProcessorOptions) {
    this.onError = options?.onError;

    // Initialize the queue
    const concurrency =
      options?.concurrency ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    this.queue = new PQueue({ concurrency });
    console.log(`ImageProcessor: Initialized queue with concurrency ${concurrency}`);

    // Initialize the worker and wrap it with Comlink
    this.worker = new Worker(new URL('./imageProcessorWorker.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.proxy = wrap<ImageProcessorWorkerAPI>(this.worker);

    // Remove the onmessage handler - results come via promise
    // this.worker.onmessage = (event: MessageEvent<ImageProcessorMessage>) => {
    //   this.handleWorkerMessage(event);
    // };

    this.worker.onerror = error => {
      console.error('Unhandled error in ImageProcessorWorker:', error);
      // This usually indicates a setup or non-recoverable worker error
      // Consider notifying the UI about a general failure
      this.onError?.('WORKER_FATAL', error.message || 'Worker failed');
    };

    this.initializeCacheCheck();
  }

  private async initializeCacheCheck() {
    try {
      await this.checkCacheForStaleBlobs();
    } catch (error) {
      console.error('Failed initial cache check:', error);
    }
  }

  // Method to set the publisher function after initialization
  public setPublisher(publisher: (data: ProcessedImageUpdate) => void) {
    console.log('[ImageProcessor] Publisher function set.');
    this.publisher = publisher;
  }

  // --- Cache Management Methods ---
  private async getCacheEntry(id: string): Promise<ProcessedImageCacheEntry | undefined> {
    const db = await getDb();
    return db.get(STORE_NAME, id);
  }

  private async setCacheEntry(entry: ProcessedImageCacheEntry): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, entry);
  }

  private async deleteCacheEntry(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  }

  private async checkCacheForStaleBlobs() {
    console.log('ImageProcessor: Checking cache for stale blob URLs...');
    const db = await getDb();
    const allEntries = await db.getAll(STORE_NAME);
    let staleCount = 0;

    for (const entry of allEntries) {
      let shouldDelete = false;
      try {
        // Check low-res blob
        if (entry.lowResUrl && entry.lowResUrl.startsWith('blob:')) {
          const response = await fetch(entry.lowResUrl).catch(() => null);
          if (!response || !response.ok) {
            console.warn(`Stale low-res blob URL found for ${entry.id}. Removing.`);
            shouldDelete = true; // Mark for deletion if blob is invalid
          }
        }
        // Check high-res blob
        if (entry.highResUrl && entry.highResUrl.startsWith('blob:')) {
          const response = await fetch(entry.highResUrl).catch(() => null);
          if (!response || !response.ok) {
            console.warn(`Stale high-res blob URL found for ${entry.id}. Removing.`);
            shouldDelete = true;
          }
        }
      } catch (e) {
        console.warn(`Error checking blob URL for ${entry.id}. Assuming stale.`, e);
        shouldDelete = true;
      }

      if (shouldDelete) {
        await this.deleteCacheEntry(entry.id);
        staleCount++;
        // console.log(`ImageProcessor: Deleted stale cache entry for ${entry.id}`);
      }
    }

    if (staleCount > 0) {
      console.log(`ImageProcessor: Removed ${staleCount} stale cache entries.`);
    } else {
      console.log('ImageProcessor: No stale blob URLs found in cache.');
    }
  }

  // --- Public Processing Methods (using Comlink) ---

  async processImage(image: ImageInfo): Promise<void> {
    const { id, src, width, height } = image;

    if (!id || !src || !width || !height) {
      console.error('Invalid image data provided to processImage:', image);
      this.onError?.(id || 'unknown', 'Invalid image data');
      return;
    }

    // Check cache immediately before queueing
    try {
      const cachedEntry = await this.getCacheEntry(id);
      const lowResMatches =
        cachedEntry?.lowResWidth === Math.round(width / 4) &&
        cachedEntry?.lowResHeight === Math.round(height / 4);
      const highResMatches = cachedEntry?.width === width && cachedEntry?.height === height;

      if (cachedEntry?.lowResUrl && cachedEntry?.highResUrl && lowResMatches && highResMatches) {
        console.log(`ImageProcessor: Cache hit for ${id} (pre-queue). Skipping queue.`);
        // Publish low-res from cache
        this.publisher?.({
          id,
          quality: 'low',
          imageUrl: cachedEntry.lowResUrl,
          width: cachedEntry.lowResWidth!,
          height: cachedEntry.lowResHeight!,
        });
        // Publish high-res from cache
        this.publisher?.({
          id,
          quality: 'high',
          imageUrl: cachedEntry.highResUrl,
          width: cachedEntry.width!,
          height: cachedEntry.height!,
        });
        return; // Already cached, no need to queue
      }
    } catch (cacheError) {
      console.error(`ImageProcessor: Error checking cache pre-queue for ${id}:`, cacheError);
      // Proceed to queue anyway?
    }

    // Check if already actively being processed or queued
    if (this.activeRequests.has(id)) {
      console.log(`ImageProcessor: Request for ${id} is already active/queued. Skipping.`);
      return;
    }

    // Create controller and add to active requests *before* queueing
    const controller = new AbortController();
    this.activeRequests.set(id, controller);

    // Add the processing logic to the queue
    this.queue
      .add(async () => {
        console.log(
          `ImageProcessor: Starting queued task for ${id}. Queue size: ${this.queue.size}`
        );
        let createdBitmap: ImageBitmap | null = null;
        try {
          // Re-check cache inside queue in case it was populated while waiting
          const cachedEntry = await this.getCacheEntry(id);
          const lowResMatches =
            cachedEntry?.lowResWidth === Math.round(width / 4) &&
            cachedEntry?.lowResHeight === Math.round(height / 4);
          const highResMatches = cachedEntry?.width === width && cachedEntry?.height === height;

          if (
            cachedEntry?.lowResUrl &&
            cachedEntry?.highResUrl &&
            lowResMatches &&
            highResMatches
          ) {
            console.log(`ImageProcessor: Cache hit for ${id} (in-queue). Skipping processing.`);
            // Publish low-res from cache
            this.publisher?.({
              id,
              quality: 'low',
              imageUrl: cachedEntry.lowResUrl,
              width: cachedEntry.lowResWidth!,
              height: cachedEntry.lowResHeight!,
            });
            // Publish high-res from cache
            this.publisher?.({
              id,
              quality: 'high',
              imageUrl: cachedEntry.highResUrl,
              width: cachedEntry.width!,
              height: cachedEntry.height!,
            });
            return; // Exit queued task
          }

          // Check signal before potentially long operations
          if (controller.signal.aborted)
            throw new DOMException('Aborted before processing', 'AbortError');

          // --- Prepare / Fetch Bitmap (same logic as before) ---
          let reason = 'No cache entry';
          let needsProcessing = true;

          if (cachedEntry && (!lowResMatches || !highResMatches)) {
            reason = `Cache found for ${id} but dimensions mismatch. Requesting re-processing.`;
            await this.deleteCacheEntry(id);
          } else if (cachedEntry?.lowResUrl && lowResMatches) {
            reason = `Low-res cache hit for ${id}, processing for high-res.`;
            // Publish low-res from cache
            this.publisher?.({
              id,
              quality: 'low',
              imageUrl: cachedEntry.lowResUrl,
              width: cachedEntry.lowResWidth!,
              height: cachedEntry.lowResHeight!,
            });
          } else if (cachedEntry) {
            reason = `Inconsistent cache state for ${id}. Requesting re-processing.`;
            await this.deleteCacheEntry(id);
          }

          console.log(`ImageProcessor: Fetching image ${id} to create ImageBitmap (queued).`);
          try {
            const response = await fetch(src, { signal: controller.signal });
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const blob = await response.blob();
            if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
            createdBitmap = await createImageBitmap(blob);
          } catch (fetchError: any) {
            if (fetchError.name !== 'AbortError') {
              console.error(
                `ImageProcessor: Error fetching/creating bitmap for ${id} (queued):`,
                fetchError
              );
              this.onError?.(id, fetchError.message || 'Failed to load image data');
            }
            // Rethrow to be caught by outer try/catch
            throw fetchError;
          }

          // --- Call Worker ---
          if (controller.signal.aborted)
            throw new DOMException('Aborted before worker call', 'AbortError');
          console.log(
            `ImageProcessor: Sending image ${id} to worker via Comlink (queued). Reason: ${reason}`
          );
          const result = await this.proxy.processImage(
            Comlink.transfer(
              { id, imageBitmap: createdBitmap, width, height /* signal: controller.signal */ },
              [createdBitmap]
            )
          );
          createdBitmap = null; // Nullify after transfer

          // --- Process Result ---
          if (controller.signal.aborted) {
            console.log(`ImageProcessor: Processing for ${id} aborted after worker call (queued).`);
            if (result.lowResUrl) URL.revokeObjectURL(result.lowResUrl);
            if (result.highResUrl) URL.revokeObjectURL(result.highResUrl);
            return;
          }

          console.log(`ImageProcessor: Received results for ${id} from worker (queued).`);
          const finalEntry: ProcessedImageCacheEntry = {
            ...((await this.getCacheEntry(id)) || { id }),
            id,
            lowResUrl: result.lowResUrl ?? cachedEntry?.lowResUrl,
            lowResWidth: result.lowResUrl ? Math.round(width / 4) : cachedEntry?.lowResWidth,
            lowResHeight: result.lowResUrl ? Math.round(height / 4) : cachedEntry?.lowResHeight,
            highResUrl: result.highResUrl,
            width: result.highResUrl ? width : cachedEntry?.width,
            height: result.highResUrl ? height : cachedEntry?.height,
            timestamp: Date.now(),
          };

          await this.setCacheEntry(finalEntry);

          // Publish results using the publisher function
          if (result.lowResUrl) {
            this.publisher?.({
              id,
              quality: 'low',
              imageUrl: finalEntry.lowResUrl!,
              width: finalEntry.lowResWidth!,
              height: finalEntry.lowResHeight!,
            });
          }
          if (result.highResUrl) {
            this.publisher?.({
              id,
              quality: 'high',
              imageUrl: finalEntry.highResUrl!,
              width: finalEntry.width!,
              height: finalEntry.height!,
            });
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log(`ImageProcessor: Queued task for ${id} aborted.`);
          } else {
            console.error(`ImageProcessor: Error during queued processing for ${id}:`, error);
            this.onError?.(id, error.message || 'Queued processing failed');
          }
        } finally {
          if (createdBitmap) {
            try {
              createdBitmap.close();
            } catch (e) {
              console.warn(`Error closing untransferred bitmap for ${id} (queued):`, e);
            }
          }
          // Remove from active requests only when the queued task finishes/errors/aborts
          this.activeRequests.delete(id);
          console.log(
            `ImageProcessor: Finished queued task for ${id}. Queue size: ${this.queue.size}`
          );
        }
      })
      .catch(error => {
        // Catch errors from queue.add itself (rare)
        console.error(`ImageProcessor: Error adding task to queue for ${id}:`, error);
        this.activeRequests.delete(id); // Ensure cleanup if add fails
        this.onError?.(id, error.message || 'Failed to queue task');
      });
  }

  async processBatch(images: ImageInfo[]): Promise<void> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // Check if a batch request is already active/queued (using a placeholder ID structure)
    // This simple check might not be sufficient if overlapping batches are possible
    if (this.activeRequests.has(batchId)) {
      // Use generated batchId for tracking
      console.log(
        `ImageProcessor: Batch request ${batchId} appears to be already active/queued. Skipping.`
      );
      return;
    }

    const controller = new AbortController();
    this.activeRequests.set(batchId, controller);

    // Add batch processing logic to the queue
    this.queue
      .add(async () => {
        console.log(
          `ImageProcessor: Starting queued batch task ${batchId}. Queue size: ${this.queue.size}`
        );
        const imagesToProcess: Array<{
          id: string;
          imageBitmap: ImageBitmap;
          width: number;
          height: number;
        }> = [];
        const transferList: ImageBitmap[] = [];
        const preCheckPromises: Promise<void>[] = [];
        const createdBitmaps: ImageBitmap[] = [];
        let batchError: Error | null = null; // Track error within the queued task

        try {
          console.log(
            `ImageProcessor: Starting batch preparation for ${images.length} images (queued). Batch ID: ${batchId}`
          );

          // --- Pre-check Cache and Fetch Bitmaps (inside queue task) ---
          for (const image of images) {
            const { id, src, width, height } = image;
            if (!id || !src || !width || !height) {
              console.error('Invalid image data in batch (queued):', image);
              this.onError?.(id || 'unknown-batch', 'Invalid image data in batch');
              continue;
            }

            preCheckPromises.push(
              (async () => {
                if (controller.signal.aborted) return;
                let localBitmap: ImageBitmap | null = null;
                try {
                  const cachedEntry = await this.getCacheEntry(id);
                  const lowResMatches =
                    cachedEntry?.lowResWidth === Math.round(width / 4) &&
                    cachedEntry?.lowResHeight === Math.round(height / 4);
                  const highResMatches =
                    cachedEntry?.width === width && cachedEntry?.height === height;

                  if (
                    cachedEntry?.lowResUrl &&
                    cachedEntry?.highResUrl &&
                    lowResMatches &&
                    highResMatches
                  ) {
                    if (controller.signal.aborted) return;
                    // Publish low-res from cache
                    this.publisher?.({
                      id,
                      quality: 'low',
                      imageUrl: cachedEntry.lowResUrl,
                      width: cachedEntry.lowResWidth!,
                      height: cachedEntry.lowResHeight!,
                    });
                    // Publish high-res from cache
                    this.publisher?.({
                      id,
                      quality: 'high',
                      imageUrl: cachedEntry.highResUrl,
                      width: cachedEntry.width!,
                      height: cachedEntry.height!,
                    });
                    return;
                  }

                  if (cachedEntry && (!lowResMatches || !highResMatches)) {
                    if (controller.signal.aborted) return;
                    console.log(
                      `ImageProcessor: Clearing mismatched cache for batch item ${id} (queued)`
                    );
                    await this.deleteCacheEntry(id);
                  }

                  if (controller.signal.aborted) return;
                  console.log(`ImageProcessor: Fetching batch item ${id} (queued)`);
                  const response = await fetch(src, { signal: controller.signal });
                  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
                  const blob = await response.blob();
                  if (controller.signal.aborted) return;
                  localBitmap = await createImageBitmap(blob);
                  createdBitmaps.push(localBitmap);

                  imagesToProcess.push({ id, imageBitmap: localBitmap, width, height });
                  transferList.push(localBitmap);

                  if (cachedEntry?.lowResUrl && lowResMatches) {
                    if (controller.signal.aborted) return;
                    // Publish low-res from cache
                    this.publisher?.({
                      id,
                      quality: 'low',
                      imageUrl: cachedEntry.lowResUrl,
                      width: cachedEntry.lowResWidth!,
                      height: cachedEntry.lowResHeight!,
                    });
                  }
                } catch (error: any) {
                  if (localBitmap) {
                    try {
                      localBitmap.close();
                    } catch {}
                    const index = createdBitmaps.indexOf(localBitmap);
                    if (index > -1) createdBitmaps.splice(index, 1);
                  }
                  if (error.name !== 'AbortError') {
                    console.error(
                      `ImageProcessor: Error preparing batch item ${id} (queued):`,
                      error
                    );
                    this.onError?.(id, error.message || 'Batch item preparation failed');
                  } else {
                    // Re-throw abort error to stop Promise.all
                    throw error;
                  }
                }
              })()
            );
          }

          // Wait for preparation inside the queue task
          await Promise.all(preCheckPromises);

          if (controller.signal.aborted) {
            console.log(`ImageProcessor: Batch ${batchId} aborted during preparation (queued).`);
            throw new DOMException('Batch preparation aborted', 'AbortError');
          }

          // --- Call Worker ---
          if (imagesToProcess.length > 0) {
            console.log(
              `ImageProcessor: Sending batch ${batchId} of ${imagesToProcess.length} images to worker via Comlink (queued).`
            );
            const batchResults = await this.proxy.processBatch(
              Comlink.transfer(
                { images: imagesToProcess /* signal: controller.signal */ },
                transferList
              )
            );

            // --- Process Results ---
            if (controller.signal.aborted) {
              console.log(
                `ImageProcessor: Batch ${batchId} aborted after worker completed (queued).`
              );
              batchResults.forEach(r => {
                if (r.lowResUrl) URL.revokeObjectURL(r.lowResUrl);
                if (r.highResUrl) URL.revokeObjectURL(r.highResUrl);
              });
              // Still need to throw abort error to trigger finally cleanup correctly
              throw new DOMException('Batch aborted post-worker', 'AbortError');
            }

            console.log(
              `ImageProcessor: Received ${batchResults.length} results for batch ${batchId} (queued).`
            );
            const cacheUpdatePromises: Promise<void>[] = [];
            for (const result of batchResults) {
              const { id: resultId, lowResUrl, highResUrl } = result;
              const originalItem = imagesToProcess.find(item => item.id === resultId);
              const originalWidth = originalItem?.width;
              const originalHeight = originalItem?.height;

              if (!originalWidth || !originalHeight) continue;
              const existingEntry = await this.getCacheEntry(resultId);
              const finalEntry: ProcessedImageCacheEntry = {
                id: resultId,
                lowResUrl: result.lowResUrl ?? existingEntry?.lowResUrl,
                lowResWidth: result.lowResUrl
                  ? Math.round(originalWidth / 4)
                  : existingEntry?.lowResWidth,
                lowResHeight: result.lowResUrl
                  ? Math.round(originalHeight / 4)
                  : existingEntry?.lowResHeight,
                highResUrl: result.highResUrl ?? existingEntry?.highResUrl,
                width: result.highResUrl ? originalWidth : existingEntry?.width,
                height: result.highResUrl ? originalHeight : existingEntry?.height,
                timestamp: Date.now(),
              };
              cacheUpdatePromises.push(this.setCacheEntry(finalEntry));
              // Publish results using the publisher function
              if (result.lowResUrl) {
                this.publisher?.({
                  id: resultId,
                  quality: 'low',
                  imageUrl: finalEntry.lowResUrl!,
                  width: finalEntry.lowResWidth!,
                  height: finalEntry.lowResHeight!,
                });
              }
              if (result.highResUrl) {
                this.publisher?.({
                  id: resultId,
                  quality: 'high',
                  imageUrl: finalEntry.highResUrl!,
                  width: finalEntry.width!,
                  height: finalEntry.height!,
                });
              }
            }
            await Promise.all(cacheUpdatePromises);
          } else {
            console.log(
              `ImageProcessor: No images needed processing for batch ${batchId} (queued).`
            );
          }
        } catch (error: any) {
          batchError = error; // Store error to handle in finally
          if (error.name === 'AbortError') {
            console.log(`ImageProcessor: Queued batch ${batchId} processing aborted.`);
          } else {
            console.error(`ImageProcessor: Error processing queued batch ${batchId}:`, error);
            this.onError?.(batchId, error.message || 'Queued batch processing failed');
          }
        } finally {
          // Ensure bitmaps not transferred are closed if aborted/errored during prep
          // Also close bitmaps if a non-abort error occurred after prep
          if (batchError?.name === 'AbortError' || batchError) {
            createdBitmaps.forEach(bitmap => {
              // Check if it was actually transferred before trying to close
              if (!transferList.includes(bitmap)) {
                try {
                  bitmap.close();
                } catch {}
              }
            });
          }
          // Worker handles closing transferred bitmaps
          this.activeRequests.delete(batchId);
          console.log(
            `ImageProcessor: Finished queued batch task ${batchId}. Queue size: ${this.queue.size}`
          );
        }
      })
      .catch(error => {
        // Catch errors from queue.add itself
        console.error(`ImageProcessor: Error adding batch task to queue ${batchId}:`, error);
        this.activeRequests.delete(batchId); // Ensure cleanup
        this.onError?.(batchId, error.message || 'Failed to queue batch task');
      });
  }

  // --- Control Methods ---
  cancel(id?: string) {
    if (id) {
      const controller = this.activeRequests.get(id);
      if (controller) {
        console.log(`ImageProcessor: Aborting request ${id}.`);
        controller.abort();
        // Don't delete immediately, let the queued task handle cleanup in finally
        // this.activeRequests.delete(id);
      } else {
        console.log(`ImageProcessor: No active request found for ID ${id} to cancel.`);
      }
    } else {
      console.log(
        `ImageProcessor: Aborting all ${this.activeRequests.size} active requests and clearing queue.`
      );
      // Abort all active controllers
      this.activeRequests.forEach(controller => controller.abort());
      // Clear pending tasks from the queue
      this.queue.clear();
      // Clear the tracking map
      this.activeRequests.clear();
    }
  }

  cancelAll() {
    this.cancel(); // cancel() without id now handles clearing everything
  }

  terminate() {
    console.log(
      'ImageProcessor: Terminating worker, cancelling active requests, clearing queue, and closing DB.'
    );
    this.cancelAll(); // Abort ongoing and clear pending
    // Add a small delay to allow abort signals to propagate potentially?
    // setTimeout(() => {...
    try {
      this.proxy[Comlink.releaseProxy]();
    } catch (e) {
      console.warn('ImageProcessor: Error releasing Comlink proxy:', e);
    }
    this.worker.terminate();
    if (dbPromise) {
      getDb().then(db => db.close());
      dbPromise = null;
    }
    // }, 50); // Example delay
  }
}

export function createImageProcessor(options?: Omit<ImageProcessorOptions, 'onImageProcessed'>) {
  return new ImageProcessor(options);
}
