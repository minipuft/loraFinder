// src/workers/colorExtractor.worker.ts

// Import the shared types from WorkerPool
import type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage } from './workerPool';

// --- Types specific to this worker's payload ---
interface ColorRequestPayload {
  id: string; // Unique ID of the image being processed
  src: string; // URL or path to the image
}

interface ColorResultPayload {
  id: string; // Original image ID
  color: string | null; // Hex color or null on error/failure
}

// Type aliases for the full message structures
type ColorRequest = WorkerRequestMessage<ColorRequestPayload>;
type ColorResponse = WorkerResponseMessage<ColorResultPayload>;
type ColorErrorResponse = WorkerErrorMessage;

/**
 * Calculates the average color of an image fetched from a URL.
 * Uses OffscreenCanvas for off-thread image processing.
 */
async function getAverageColor(src: string): Promise<string | null> {
  try {
    const response = await fetch(src); // Keep fetching original for now
    // TODO: Optimization - Modify fetch URL to request tiny image if API supports it:
    // const response = await fetch(`${src}&w=10&q=50`); // Example

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // --- OPTIMIZATION ---
    const smallSize = 10; // Use a small dimension (e.g., 10x10)
    const canvas = new OffscreenCanvas(smallSize, smallSize);
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha if not needed
    if (!ctx) {
      throw new Error('Could not get OffscreenCanvas context');
    }

    // Draw the full bitmap onto the small canvas (browser handles downscaling)
    ctx.drawImage(bitmap, 0, 0, smallSize, smallSize);
    bitmap.close(); // Close the bitmap ASAP

    // Get image data from the SMALL canvas
    const imageData = ctx.getImageData(0, 0, smallSize, smallSize);
    // --- END OPTIMIZATION ---

    const data = imageData.data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    // Iterate over the *small* canvas pixels (no sampling needed now)
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    if (count === 0) return null; // No valid pixels sampled

    const avgR = Math.round(r / count);
    const avgG = Math.round(g / count);
    const avgB = Math.round(b / count);

    // Convert average RGB to hex
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;
  } catch (error) {
    console.error(`[ColorExtractorWorker] Error processing image ${src}:`, error);
    return null; // Return null on error
  }
}

// --- Worker Message Handling (Updated) ---

self.onmessage = async (event: MessageEvent<ColorRequest>) => {
  const { type, payload, requestId } = event.data;

  // Validate message type
  if (type !== 'extractColor') {
    console.warn(`[ColorExtractorWorker] Received unexpected message type: ${type}`);
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: `Unexpected message type: ${type}`,
      requestId: requestId, // Include ID if available
    };
    self.postMessage(errorResponse);
    return;
  }

  const { id, src } = payload;

  console.log(`[ColorExtractorWorker] Received request ${requestId} for image ID: ${id}`);

  // Validate necessary payload data and requestId
  if (!id || !src || !requestId) {
    console.error(
      '[ColorExtractorWorker] Invalid data received (missing id, src, or requestId):',
      event.data
    );
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: 'Invalid data received (missing id, src, or requestId)',
      requestId: requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    const color = await getAverageColor(src);

    // Construct and post the success response
    const resultPayload: ColorResultPayload = { id, color };
    const response: ColorResponse = {
      type: 'colorResult',
      payload: resultPayload,
      requestId: requestId,
    };
    self.postMessage(response);
  } catch (error) {
    // Catch errors specifically from getAverageColor or other processing
    console.error(
      `[ColorExtractorWorker] Error processing image for request ${requestId} (ID: ${id}):`,
      error
    );
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      requestId: requestId, // Include the original request ID
    };
    self.postMessage(errorResponse);
  }
};

console.log('[ColorExtractorWorker] Initialized and ready for requests.');

// Generic error handler
self.onerror = event => {
  console.error('[ColorExtractorWorker] Unhandled error:', event);
  // Cannot easily correlate to a specific request here
};

export {}; // Make this a module
