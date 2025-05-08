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
  private workers: Worker[] = []; // Changed from single worker
  private proxies: Remote<ImageProcessorWorkerAPI>[] = []; // Changed from single proxy
  private nextWorkerIndex = 0; // For round-robin proxy selection
  private poolSize = 0; // To store the calculated pool size

  private idleTimers = new Map<Worker, NodeJS.Timeout>();
  private lastActivityTime = new Map<Worker, number>();
  private static readonly IDLE_TIMEOUT_MS = 30000; // 30 seconds

  private queue: PQueue; // Add queue instance
  private onError?: (id: string, error: string) => void;
  // Store AbortControllers for active requests
  private activeRequests = new Map<string, AbortController>();
  // Add property to hold the publisher function
  private publisher: ((data: ProcessedImageUpdate) => void) | null = null;

  constructor(options?: ImageProcessorOptions) {
    this.onError = options?.onError;

    // Initialize the queue and determine pool size
    const concurrency =
      options?.concurrency ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    this.poolSize = concurrency; // poolSize is the same as queue concurrency for now
    this.queue = new PQueue({ concurrency: this.poolSize }); // Queue concurrency matches pool size

    console.log(
      `ImageProcessor: Initialized with worker pool size ${this.poolSize} and queue concurrency ${this.queue.concurrency}`
    );

    // Initialize the worker pool
    for (let i = 0; i < this.poolSize; i++) {
      this.initializeWorkerAtIndex(i);
    }

    this.initializeCacheCheck();
  }

  private initializeWorkerAtIndex(index: number): void {
    if (this.workers[index] || this.proxies[index]) {
      console.warn(
        `ImageProcessor: Worker at index ${index} already initialized or partially initialized. Skipping.`
      );
      return;
    }
    const worker = new Worker(new URL('./imageProcessorWorker.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.workers[index] = worker;
    this.proxies[index] = wrap<ImageProcessorWorkerAPI>(worker);
    console.log(`ImageProcessor: Initialized worker instance ${index + 1}/${this.poolSize}.`);

    worker.onerror = error => {
      console.error(`Unhandled error in ImageProcessorWorker[${index}]:`, error);
      this.onError?.(
        `WORKER_FATAL_INSTANCE_${index}`,
        error.message || `Worker instance ${index} failed`
      );
      // Consider this worker dead, try to clean it up from the pool
      this.terminateSpecificWorker(worker, index, true);
    };
  }

  private scheduleIdleCheck(workerInstance: Worker, workerIndex: number): void {
    const existingTimer = this.idleTimers.get(workerInstance);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.lastActivityTime.set(workerInstance, Date.now());

    const timerId = setTimeout(() => {
      console.log(`ImageProcessor: Worker instance ${workerIndex} idle timeout. Terminating.`);
      this.terminateSpecificWorker(workerInstance, workerIndex);
    }, ImageProcessor.IDLE_TIMEOUT_MS);
    this.idleTimers.set(workerInstance, timerId);
  }

  private terminateSpecificWorker(
    workerInstance: Worker,
    index: number,
    dueToError: boolean = false
  ): void {
    if (!this.workers[index] && !this.proxies[index] && !dueToError) {
      // If already gone and not an error call, nothing to do
      if (!dueToError)
        console.log(`ImageProcessor: Worker ${index} already terminated or not found.`);
      return;
    }
    console.log(
      `ImageProcessor: Terminating worker instance ${index}. Due to error: ${dueToError}`
    );

    const proxy = this.proxies[index];
    if (proxy) {
      try {
        proxy[Comlink.releaseProxy]();
      } catch (e) {
        console.warn(`ImageProcessor: Error releasing Comlink proxy for worker ${index}:`, e);
      }
    }

    if (this.workers[index]) {
      // Check if worker exists before trying to terminate
      try {
        this.workers[index].terminate();
      } catch (e) {
        console.warn(`ImageProcessor: Error terminating worker ${index}:`, e);
      }
    }

    // Mark slot as empty for re-initialization
    // @ts-ignore
    this.workers[index] = null;
    // @ts-ignore
    this.proxies[index] = null;

    const timer = this.idleTimers.get(workerInstance);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(workerInstance);
    }
    this.lastActivityTime.delete(workerInstance);
    console.log(`ImageProcessor: Worker instance ${index} terminated and slot cleared.`);
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
        let workerIndex = -1; // Declare workerIndex here to be accessible in finally

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

          // --- Select Worker Proxy ---
          workerIndex = this.nextWorkerIndex;
          this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.poolSize;

          // Ensure worker for this slot is initialized
          if (!this.workers[workerIndex] || !this.proxies[workerIndex]) {
            console.log(
              `ImageProcessor: Worker at index ${workerIndex} was terminated or not initialized. Re-initializing.`
            );
            this.initializeWorkerAtIndex(workerIndex);
            // Check again after attempting initialization
            if (!this.workers[workerIndex] || !this.proxies[workerIndex]) {
              console.error(
                `ImageProcessor: Failed to re-initialize worker at index ${workerIndex} for ${id}.`
              );
              this.onError?.(
                id,
                `Failed to get worker at index ${workerIndex} after re-initialization attempt.`
              );
              this.activeRequests.delete(id); // Clean up active request map
              return; // Cannot proceed
            }
          }

          const selectedWorker = this.workers[workerIndex];
          const selectedProxy = this.proxies[workerIndex];

          // Clear idle timer for the selected worker as it's about to become active
          const existingTimer = this.idleTimers.get(selectedWorker);
          if (existingTimer) {
            clearTimeout(existingTimer);
            this.idleTimers.delete(selectedWorker);
          }

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
            `ImageProcessor: Sending image ${id} to worker instance ${workerIndex} via Comlink (queued). Reason: ${reason}`
          );
          const result = await selectedProxy.processImage(
            Comlink.transfer(
              { id, imageBitmap: createdBitmap, width, height, signal: controller.signal },
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
          this.activeRequests.delete(id);
          // Schedule idle check for the worker that just finished
          if (this.workers[workerIndex]) {
            // Check if worker still exists (wasn't terminated by error)
            this.scheduleIdleCheck(this.workers[workerIndex], workerIndex);
          }
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
        let batchWorkerIndex = -1; // Declare batchWorkerIndex here

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
                    const lowResUpdate: ProcessedImageUpdate = {
                      id,
                      quality: 'low',
                      imageUrl: cachedEntry.lowResUrl,
                      width: cachedEntry.lowResWidth!,
                      height: cachedEntry.lowResHeight!,
                    };
                    this.publisher?.(lowResUpdate);

                    // Publish high-res from cache
                    const highResUpdate: ProcessedImageUpdate = {
                      id,
                      quality: 'high',
                      imageUrl: cachedEntry.highResUrl,
                      width: cachedEntry.width!,
                      height: cachedEntry.height!,
                    };
                    this.publisher?.(highResUpdate);
                    return; // Already cached, no need to queue
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
                    const lowResUpdate: ProcessedImageUpdate = {
                      id,
                      quality: 'low',
                      imageUrl: cachedEntry.lowResUrl,
                      width: cachedEntry.lowResWidth!,
                      height: cachedEntry.lowResHeight!,
                    };
                    this.publisher?.(lowResUpdate);
                  }
                } catch (error: any) {
                  if (localBitmap && typeof localBitmap.close === 'function') {
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

          // --- Select Worker Proxy for Batch ---
          batchWorkerIndex = this.nextWorkerIndex;
          this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.poolSize;

          // Ensure worker for this slot is initialized
          if (!this.workers[batchWorkerIndex] || !this.proxies[batchWorkerIndex]) {
            console.log(
              `ImageProcessor: Worker at index ${batchWorkerIndex} for batch was terminated or not initialized. Re-initializing.`
            );
            this.initializeWorkerAtIndex(batchWorkerIndex);
            if (!this.workers[batchWorkerIndex] || !this.proxies[batchWorkerIndex]) {
              console.error(
                `ImageProcessor: Failed to re-initialize worker at index ${batchWorkerIndex} for batch ${batchId}.`
              );
              this.onError?.(
                batchId,
                `Failed to get worker at index ${batchWorkerIndex} for batch after re-initialization attempt.`
              );
              this.activeRequests.delete(batchId); // Clean up active request map
              // Ensure createdBitmaps are closed if we abort here, as they won't be transferred.
              createdBitmaps.forEach(bmp => {
                try {
                  bmp.close();
                } catch (e) {}
              });
              throw new Error(
                `Failed to re-initialize worker for batch at index ${batchWorkerIndex}`
              ); // Propagate error to queue
            }
          }

          const selectedBatchWorker = this.workers[batchWorkerIndex];
          const selectedBatchProxy = this.proxies[batchWorkerIndex];

          // Clear idle timer for the selected worker
          const existingBatchTimer = this.idleTimers.get(selectedBatchWorker);
          if (existingBatchTimer) {
            clearTimeout(existingBatchTimer);
            this.idleTimers.delete(selectedBatchWorker);
          }

          let batchResults = [];
          try {
            if (imagesToProcess.length > 0) {
              console.log(
                `ImageProcessor: Sending batch ${batchId} of ${imagesToProcess.length} images to worker instance ${batchWorkerIndex} via Comlink (queued).`
              );
              batchResults = await selectedBatchProxy.processBatch(
                Comlink.transfer(
                  { images: imagesToProcess, signal: controller.signal },
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
            // Schedule idle check for the worker that just finished this batch
            if (this.workers[batchWorkerIndex]) {
              // Check if worker still exists
              this.scheduleIdleCheck(this.workers[batchWorkerIndex], batchWorkerIndex);
            }
            console.log(
              `ImageProcessor: Finished queued batch task ${batchId}. Queue size: ${this.queue.size}`
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
      // Clear all idle timers as well
      this.idleTimers.forEach(timerId => clearTimeout(timerId));
      this.idleTimers.clear();
      this.lastActivityTime.clear();
    }
  }

  cancelAll() {
    this.cancel(); // cancel() without id now handles clearing everything

    // Clear all idle timers before attempting to terminate workers
    this.idleTimers.forEach(timerId => clearTimeout(timerId));
    this.idleTimers.clear();
    this.lastActivityTime.clear();

    try {
      // Release Comlink proxies first
      for (const proxy of this.proxies) {
        try {
          proxy[Comlink.releaseProxy]();
        } catch (e) {
          console.warn('ImageProcessor: Error releasing a Comlink proxy:', e);
        }
      }
      // Terminate workers
      for (const worker of this.workers) {
        try {
          worker.terminate();
        } catch (e) {
          console.warn('ImageProcessor: Error terminating a worker:', e);
        }
      }
    } catch (e) {
      console.warn('ImageProcessor: Error during bulk proxy/worker termination:', e);
    }
    this.proxies = [];
    this.workers = [];

    if (dbPromise) {
      getDb().then(db => db.close());
      dbPromise = null;
    }
  }
}

export function createImageProcessor(options?: Omit<ImageProcessorOptions, 'onImageProcessed'>) {
  return new ImageProcessor(options);
}
