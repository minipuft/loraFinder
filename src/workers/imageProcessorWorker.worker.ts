import { expose } from 'comlink';

// --- Helper to check signal and throw --- //
function checkSignal(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Processing aborted by user.', 'AbortError');
  }
}

// --- Individual Functions Exposed via Comlink ---

async function processImage(data: {
  id: string;
  imageBitmap: ImageBitmap;
  width: number;
  height: number;
  signal?: AbortSignal;
}): Promise<{ lowResUrl?: string; highResUrl?: string }> {
  // Return type updated
  const { id, imageBitmap: img, width, height, signal } = data;
  console.log(`Worker: Starting processImage for ${id} using ImageBitmap`);

  const results: { lowResUrl?: string; highResUrl?: string } = {};

  const abortHandler = () => {
    console.log(`Worker: Abort signalled for ${id}`);
  };
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    checkSignal(signal);

    // Create low-res
    const lowResWidth = Math.round(width / 4);
    const lowResHeight = Math.round(height / 4);
    const lowResCanvas = new OffscreenCanvas(lowResWidth, lowResHeight);
    const lowResCtx = lowResCanvas.getContext('2d');

    if (lowResCtx) {
      lowResCtx.drawImage(img, 0, 0, lowResWidth, lowResHeight);
      checkSignal(signal);
      const lowResBlob = await lowResCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
      checkSignal(signal);
      results.lowResUrl = URL.createObjectURL(lowResBlob);
      // Don't postMessage, return instead
    } else {
      console.error(`Worker: Failed to get 2D context for low-res canvas (${id})`);
    }

    checkSignal(signal);

    // Process the full-resolution image
    const fullCanvas = new OffscreenCanvas(width, height);
    const fullCtx = fullCanvas.getContext('2d');
    if (fullCtx) {
      fullCtx.drawImage(img, 0, 0, width, height);
      checkSignal(signal);
      const fullBlob = await fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
      checkSignal(signal);
      results.highResUrl = URL.createObjectURL(fullBlob);
      // Don't postMessage, return instead
    } else {
      console.error(`Worker: Failed to get 2D context for full canvas (${id})`);
    }

    console.log(`Worker: Finished processImage for ${id}`);
    return results; // Return the generated URLs
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`Worker: processImage for ${id} aborted successfully.`);
    } else {
      console.error(`Worker: Error processing image ${id}:`, error);
    }
    // Revoke any partially created blob URLs on error/abort
    if (results.lowResUrl) URL.revokeObjectURL(results.lowResUrl);
    if (results.highResUrl) URL.revokeObjectURL(results.highResUrl);
    // Re-throw non-abort errors so Comlink propagates them
    if (error.name !== 'AbortError') throw error;
    return {}; // Return empty object on abort
  } finally {
    signal?.removeEventListener('abort', abortHandler);
    // IMPORTANT: Close the ImageBitmap to free memory
    // The main thread transferred ownership, so the worker must close it.
    img.close();
  }
}

async function processBatch(data: {
  images: Array<{ id: string; imageBitmap: ImageBitmap; width: number; height: number }>;
  signal?: AbortSignal;
}): Promise<Array<{ id: string; lowResUrl?: string; highResUrl?: string }>> {
  // Return type updated
  const { images, signal } = data;
  console.log(`Worker: Starting batch processing for ${images.length} images using ImageBitmaps.`);
  const batchResults: Array<{ id: string; lowResUrl?: string; highResUrl?: string }> = [];

  const abortHandler = () => {
    console.log('Worker: Abort signalled for batch');
  };
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    checkSignal(signal);

    for (const imageItem of images) {
      checkSignal(signal);
      const { id, imageBitmap: img, width, height } = imageItem;
      console.log(`Worker: Starting batch item ${id}`);
      const itemResults: { lowResUrl?: string; highResUrl?: string } = {};

      try {
        // Create low-res
        const lowResWidth = Math.round(width / 4);
        const lowResHeight = Math.round(height / 4);
        const lowResCanvas = new OffscreenCanvas(lowResWidth, lowResHeight);
        const lowResCtx = lowResCanvas.getContext('2d');
        if (lowResCtx) {
          lowResCtx.drawImage(img, 0, 0, lowResWidth, lowResHeight);
          checkSignal(signal);
          const lowResBlob = await lowResCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
          checkSignal(signal);
          itemResults.lowResUrl = URL.createObjectURL(lowResBlob);
        } else {
          console.error(`Worker: Failed to get 2D context for low-res canvas (batch item ${id})`);
        }

        checkSignal(signal);

        // Create high-res
        const fullCanvas = new OffscreenCanvas(width, height);
        const fullCtx = fullCanvas.getContext('2d');
        if (fullCtx) {
          fullCtx.drawImage(img, 0, 0, width, height);
          checkSignal(signal);
          const fullBlob = await fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
          checkSignal(signal);
          itemResults.highResUrl = URL.createObjectURL(fullBlob);
        } else {
          console.error(`Worker: Failed to get 2D context for full canvas (batch item ${id})`);
        }

        batchResults.push({ id, ...itemResults });
        console.log(`Worker: Finished batch item ${id}`);
      } catch (innerError: any) {
        if (innerError.name === 'AbortError') {
          console.log(`Worker: Batch processing aborted at item ${id}.`);
          throw innerError; // Re-throw to stop the batch loop
        }
        console.error(`Worker: Error processing batch item ${id}:`, innerError);
        // Add error entry or skip? For now, skip adding to results on error.
        // Revoke any partially created blobs for this item
        if (itemResults.lowResUrl) URL.revokeObjectURL(itemResults.lowResUrl);
        if (itemResults.highResUrl) URL.revokeObjectURL(itemResults.highResUrl);
      } finally {
        // Close bitmap for this item
        img.close();
      }
    }
    console.log(`Worker: Finished batch processing loop.`);
    return batchResults; // Return all results
  } catch (outerError: any) {
    if (outerError.name === 'AbortError') {
      console.log('Worker: Batch processing aborted successfully.');
    } else {
      console.error('Worker: Unexpected error during batch processing:', outerError);
    }
    // Clean up any results created before abort/error
    batchResults.forEach(r => {
      if (r.lowResUrl) URL.revokeObjectURL(r.lowResUrl);
      if (r.highResUrl) URL.revokeObjectURL(r.highResUrl);
    });
    // Close any remaining bitmaps if the loop was aborted midway
    images.forEach(item => {
      // Check if already processed/closed? Hard to track perfectly here.
      // Try closing, ignore errors if already closed.
      try {
        item.imageBitmap.close();
      } catch {}
    });
    if (outerError.name !== 'AbortError') throw outerError; // Re-throw non-abort
    return []; // Return empty array on abort
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }
}

// --- Comlink Setup ---
const workerApi = {
  processImage,
  processBatch,
};

expose(workerApi);
