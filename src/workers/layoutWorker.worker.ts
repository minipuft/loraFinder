import { ImageInfo } from '../types/index.js';
// Import the shared types from WorkerPool
import type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage } from './workerPool';
// Import shared layout logic and types from the main thread utility
import {
  distributeImages, // Helper function
  RowConfig,
} from '../utils/layoutCalculator.js'; // Adjust path as needed

// --- Types specific to this worker's communication --- >
// Keep these as they define the worker's specific message interface
interface LayoutRequestPayload {
  images: ImageInfo[];
  containerWidth: number;
  zoom: number;
  targetRowHeight: number;
}

// Payload for successful result - Uses the imported RowConfig type
type LayoutResultPayload = RowConfig[];

// Type aliases for the full message structures
type LayoutRequest = WorkerRequestMessage<LayoutRequestPayload>;
type LayoutResponse = WorkerResponseMessage<LayoutResultPayload>;
type LayoutErrorResponse = WorkerErrorMessage;

// --- Worker Message Handling (Uses imported distributeImages) --- >

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { type, payload, requestId } = event.data;

  if (type !== 'calculateLayout') {
    console.warn(`[LayoutWorker] Received unexpected message type: ${type}`);
    const errorResponse: LayoutErrorResponse = {
      type: 'error',
      message: `Unexpected message type: ${type}`,
      requestId: requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  const { images, containerWidth, zoom, targetRowHeight } = payload;

  console.log(`[LayoutWorker] Received request ${requestId} for ${images?.length} images.`);

  if (!images || !containerWidth || typeof zoom === 'undefined' || !requestId) {
    console.error(
      '[LayoutWorker] Invalid data received (missing payload data or requestId):',
      event.data
    );
    const errorResponse: LayoutErrorResponse = {
      type: 'error',
      message: 'Invalid data received (missing payload data or requestId)',
      requestId: requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    const startTime = performance.now();
    // --- Call the imported layout function --- >
    const calculatedRows: RowConfig[] = distributeImages(
      images,
      containerWidth,
      zoom,
      targetRowHeight
    );
    const endTime = performance.now();
    console.log(
      `[LayoutWorker] Layout calculation for ${requestId} took ${(endTime - startTime).toFixed(2)} ms.`
    );

    // Post success response with payload and requestId
    const response: LayoutResponse = {
      type: 'layoutResult',
      payload: calculatedRows,
      requestId: requestId,
    };
    self.postMessage(response);
  } catch (error) {
    console.error(
      `[LayoutWorker] Error during layout calculation for request ${requestId}:`,
      error
    );
    const errorResponse: LayoutErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      requestId: requestId,
    };
    self.postMessage(errorResponse);
  }
};

console.log(
  '[LayoutWorker] Initialized and ready for requests. Using layout logic from layoutCalculator.'
);

self.onerror = event => {
  if (event instanceof ErrorEvent) {
    console.error('[LayoutWorker] Unhandled error:', event.message, event);
  } else {
    console.error('[LayoutWorker] Unhandled error (non-ErrorEvent):', event);
  }
};

export {}; // Make this a module
