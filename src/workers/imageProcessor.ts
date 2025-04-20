import { IDBPDatabase, openDB } from 'idb';

// Interface for the data stored in IndexedDB
interface CachedProcessedImage {
  id: string;
  width?: number; // Dimensions at the time of caching
  height?: number;
  low?: string; // Blob URL for low-res
  high?: string; // Blob URL for high-res
}

interface ImageProcessorMessage {
  action: 'processImage' | 'processBatch' | 'imageProcessed' | 'cancel';
  images?: { id: string; src: string; width: number; height: number }[];
  id?: string;
  processedImage?: string;
  quality?: 'low' | 'high';
  width?: number;
  height?: number;
  src?: string;
}

type ProcessedImageCallback = (data: {
  id: string;
  quality: 'low' | 'high';
  processedImage: string;
}) => void;

// Helper function (can be defined outside the class or as a private static method)
const areDimensionsDifferent = (
  cachedWidth: number | undefined,
  cachedHeight: number | undefined,
  requestedWidth: number,
  requestedHeight: number,
  threshold = 0.25 // Allow 25% difference in either dimension
): boolean => {
  if (
    cachedWidth === undefined ||
    cachedHeight === undefined ||
    requestedWidth <= 0 || // Avoid division by zero
    requestedHeight <= 0
  ) {
    return true; // Treat as different if cache dimensions missing or request invalid
  }
  const widthDiff = Math.abs(cachedWidth - requestedWidth) / requestedWidth;
  const heightDiff = Math.abs(cachedHeight - requestedHeight) / requestedHeight;

  // console.log(`Dim Check (${cachedWidth}x${cachedHeight} vs ${requestedWidth}x${requestedHeight}): WDiff=${widthDiff.toFixed(2)}, HDiff=${heightDiff.toFixed(2)}`);

  return widthDiff > threshold || heightDiff > threshold;
};

class ImageProcessor {
  private worker: Worker;
  private db: IDBPDatabase<{
    processedImages: { key: string; value: CachedProcessedImage };
  }> | null = null;
  private requestQueue: {
    type: 'image' | 'batch';
    payload: any;
    callback?: ProcessedImageCallback;
  }[] = [];
  private isProcessing = false;
  private isWorkerCancelled = false;
  private callbacks: Map<string, ProcessedImageCallback[]> = new Map();

  constructor() {
    this.worker = new Worker(new URL('./imageProcessorWorker.ts', import.meta.url));
    this.initDB();
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = error => {
      console.error('Error in ImageProcessorWorker:', error);
      this.isProcessing = false;
      this.processNextRequest();
    };
  }

  private async initDB() {
    try {
      this.db = await openDB('imageCache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('processedImages')) {
            db.createObjectStore('processedImages', { keyPath: 'id' });
          }
        },
      });

      // --- Add Cache Invalidation Logic ---
      if (this.db) {
        console.log('ImageProcessor: Checking cache for stale blob URLs...');
        const tx = this.db.transaction('processedImages', 'readwrite');
        const store = tx.objectStore('processedImages');
        let cursor = await store.openCursor();
        let staleCount = 0;

        while (cursor) {
          const value = cursor.value;
          // Check if low or high quality URLs are persisted blob URLs
          const isLowStale = value.low?.startsWith('blob:');
          const isHighStale = value.high?.startsWith('blob:');

          if (isLowStale || isHighStale) {
            // If any blob URL is found, delete the entire entry as it's stale
            await cursor.delete();
            staleCount++;
            // console.log(`ImageProcessor: Deleted stale cache entry for ${value.id}`);
          }
          cursor = await cursor.continue();
        }
        await tx.done;
        if (staleCount > 0) {
          console.log(`ImageProcessor: Removed ${staleCount} stale cache entries.`);
        } else {
          console.log('ImageProcessor: No stale blob URLs found in cache.');
        }
      }
      // --- End Cache Invalidation Logic ---
    } catch (error) {
      console.error('Failed to initialize IndexedDB for image cache:', error);
      this.db = null;
    }
  }

  private async getCachedImageData(id: string): Promise<CachedProcessedImage | null> {
    if (!this.db) return null;
    try {
      return ((await this.db.get('processedImages', id)) as CachedProcessedImage | null) ?? null;
    } catch (error) {
      console.error(`Failed to get cached image data for ${id}:`, error);
      return null;
    }
  }

  private async cacheImageData(
    id: string,
    quality: 'low' | 'high',
    imageDataUrl: string,
    width: number,
    height: number
  ) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('processedImages', 'readwrite');
      const store = tx.objectStore('processedImages');
      const existingData = await store.get(id);

      const newData: CachedProcessedImage = {
        ...(existingData || {}),
        id: id,
        width: width,
        height: height,
        [quality]: imageDataUrl,
      };

      await store.put(newData);
      await tx.done;
    } catch (error) {
      console.error(`Failed to cache image data for ${id} (${quality}):`, error);
    }
  }

  private async processNextRequest() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const request = this.requestQueue.shift()!;

    if (this.isWorkerCancelled && request.type !== 'image' && request.type !== 'batch') {
      console.log('ImageProcessor: Worker cancelled, skipping non-processing request.');
      this.isProcessing = false;
      this.processNextRequest();
      return;
    }

    if (request.type === 'image') {
      this.isWorkerCancelled = false;
      await this.processImageRequest(request.payload, request.callback);
    } else if (request.type === 'batch') {
      this.isWorkerCancelled = false;
      await this.processBatchRequest(request.payload, request.callback);
    }

    this.isProcessing = false;
    setTimeout(() => this.processNextRequest(), 0);
  }

  private async processImageRequest(
    image: { id: string; src: string; width: number; height: number },
    callback?: ProcessedImageCallback
  ) {
    const { id, src, width: requestedWidth, height: requestedHeight } = image;

    // 1. Check Cache
    const cachedData = await this.getCachedImageData(id);

    // 2. Determine if Cache is Usable
    let needsProcessing = true;
    let reason = 'No cache found';

    if (cachedData) {
      if (cachedData.high) {
        // Check if dimensions match the current request
        const dimensionsMatch = !areDimensionsDifferent(
          cachedData.width, // Use optional chaining or ensure it exists
          cachedData.height,
          requestedWidth,
          requestedHeight
        );

        if (dimensionsMatch) {
          needsProcessing = false;
          reason = 'Cache hit (matching dimensions)';
          console.log(`ImageProcessor: Cache hit for ${id} with matching dimensions.`);

          // Trigger callback immediately with cached data
          if (callback) {
            if (cachedData.low) {
              callback({ id: id, quality: 'low', processedImage: cachedData.low });
            }
            callback({ id: id, quality: 'high', processedImage: cachedData.high });
          }
        } else {
          needsProcessing = true;
          reason = 'Cache found but dimensions mismatch';
          console.log(
            `ImageProcessor: Cache found for ${id} but dimensions mismatch. Requesting re-processing.`
          );
          // Don't use cached blobs, proceed to worker request
        }
      } else {
        needsProcessing = true;
        reason = 'Cache found but high-res missing';
        console.log(
          `ImageProcessor: Cache found for ${id} but high-res missing. Requesting processing.`
        );
        // Trigger callback with low-res if available, but still request full processing
        if (cachedData.low && callback) {
          callback({ id: id, quality: 'low', processedImage: cachedData.low });
        }
      }
    }

    // 3. Request Processing from Worker if Needed
    if (needsProcessing) {
      console.log(`ImageProcessor: Sending image ${id} to worker. Reason: ${reason}`);
      // Register callback before sending to worker
      if (callback) {
        const existingCallbacks = this.callbacks.get(id) || [];
        if (!existingCallbacks.includes(callback)) {
          this.callbacks.set(id, [...existingCallbacks, callback]);
        }
      }
      // Send request with current dimensions
      this.worker.postMessage({
        action: 'processImage',
        id,
        src,
        width: requestedWidth,
        height: requestedHeight,
      });
    }
  }

  private async processBatchRequest(
    images: { id: string; src: string; width: number; height: number }[],
    batchCallback?: ProcessedImageCallback
  ) {
    const imagesToSendToWorker = [];
    const DIMENSION_THRESHOLD = 0.1; // Same threshold as single image

    for (const image of images) {
      const { id, src, width: requestedWidth, height: requestedHeight } = image;
      const cachedData = await this.getCachedImageData(id);

      let needsProcessing = true;
      if (cachedData?.high) {
        const dimensionsMatch = !areDimensionsDifferent(
          cachedData.width,
          cachedData.height,
          requestedWidth,
          requestedHeight,
          DIMENSION_THRESHOLD
        );
        if (dimensionsMatch) {
          needsProcessing = false;
          // Trigger callback immediately with cached data if provided
          if (batchCallback) {
            if (cachedData.low)
              batchCallback({ id: id, quality: 'low', processedImage: cachedData.low });
            batchCallback({ id: id, quality: 'high', processedImage: cachedData.high });
          }
        } // else: dimensions mismatch, needs processing
      } else if (cachedData?.low && batchCallback) {
        // If only low-res cached, trigger callback for low-res but still process
        batchCallback({ id: id, quality: 'low', processedImage: cachedData.low });
      }

      if (needsProcessing) {
        imagesToSendToWorker.push(image); // Add to worker batch
        // Register callback for this image
        if (batchCallback) {
          const existingCallbacks = this.callbacks.get(id) || [];
          if (!existingCallbacks.includes(batchCallback)) {
            this.callbacks.set(id, [...existingCallbacks, batchCallback]);
          }
        }
      }
    }

    if (imagesToSendToWorker.length > 0) {
      console.log(
        `ImageProcessor: Sending batch of ${imagesToSendToWorker.length} images to worker (out of ${images.length}).`
      );
      this.worker.postMessage({ action: 'processBatch', images: imagesToSendToWorker });
    } else {
      console.log(
        `ImageProcessor: All ${images.length} batch images were already fully cached with matching dimensions.`
      );
    }
  }

  private handleWorkerMessage(event: MessageEvent<ImageProcessorMessage>) {
    if (
      event.data.action === 'imageProcessed' &&
      event.data.id &&
      event.data.processedImage &&
      event.data.quality &&
      event.data.width !== undefined &&
      event.data.height !== undefined
    ) {
      const { id, quality, processedImage, width, height } = event.data;

      console.log(
        `ImageProcessor received processed image: ${id}, quality: ${quality}, size: ${width}x${height}`
      );

      this.cacheImageData(id, quality, processedImage, width, height);

      const imageCallbacks = this.callbacks.get(id);
      if (imageCallbacks) {
        imageCallbacks.forEach(cb => cb({ id, quality, processedImage }));
        if (quality === 'high') {
          this.callbacks.delete(id);
        }
      }
    } else {
      console.warn(
        'ImageProcessor received incomplete or unexpected message from worker:',
        event.data
      );
    }
    this.isProcessing = false;
    this.processNextRequest();
  }

  public requestImageProcessing(
    image: { id: string; src: string; width: number; height: number },
    callback?: ProcessedImageCallback
  ) {
    this.requestQueue.push({ type: 'image', payload: image, callback });
    // Ensure the processing loop is triggered if not already running
    if (!this.isProcessing) {
      this.processNextRequest();
    }
  }

  public requestBatchProcessing(
    images: { id: string; src: string; width: number; height: number }[],
    callback?: ProcessedImageCallback
  ) {
    this.requestQueue.push({ type: 'batch', payload: images, callback });
    // Ensure the processing loop is triggered if not already running
    if (!this.isProcessing) {
      this.processNextRequest();
    }
  }

  public cancel() {
    console.log('ImageProcessor: Clearing request queue and sending cancel to worker.');
    this.requestQueue = [];
    this.callbacks.clear();
    this.isWorkerCancelled = true;
    this.worker.postMessage({ action: 'cancel' });
    this.isProcessing = false;
  }

  public terminate() {
    console.log('ImageProcessor: Terminating worker and closing DB.');
    this.cancel();
    this.worker.terminate();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createImageProcessor() {
  return new ImageProcessor();
}
