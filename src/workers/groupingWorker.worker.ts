import { ImageInfo } from '../types/index.js';
import { truncateImageTitle } from '../utils/stringUtils.js'; // Assuming this util is available
// Import the shared types from WorkerPool
import type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage } from './workerPool';

// --- Types specific to this worker's payload ---
interface GroupingRequestPayload {
  images: ImageInfo[];
  isGrouped: boolean;
}

interface ImageGroup {
  key: string;
  images: ImageInfo[];
  isCarousel: boolean;
}

interface GroupingResultPayload {
  groupedImages: ImageGroup[];
}

// Type aliases for the full message structures
type GroupingRequest = WorkerRequestMessage<GroupingRequestPayload>;
type GroupingResponse = WorkerResponseMessage<GroupingResultPayload>;
type GroupingErrorResponse = WorkerErrorMessage;

// --- Core Grouping Logic (from ImageFeed useMemo) ---
const performGrouping = (images: ImageInfo[], isGrouped: boolean): ImageGroup[] => {
  console.time('[GroupingWorker] performGrouping');

  if (!Array.isArray(images) || images.length === 0) {
    console.timeEnd('[GroupingWorker] performGrouping');
    return [];
  }

  // Filter out invalid images first
  const validImages = images.filter(
    image =>
      image &&
      typeof image === 'object' &&
      'width' in image &&
      'height' in image &&
      image.width > 0 &&
      image.height > 0
  );

  // If not grouping, return each image as its own group
  if (!isGrouped) {
    const result = validImages.map(image => ({
      key: image.id, // Use ID as key when not grouped
      images: [image],
      isCarousel: false,
    }));
    console.timeEnd('[GroupingWorker] performGrouping');
    return result;
  }

  // --- Optimized Grouping Logic ---
  console.time('[GroupingWorker] precompute titles');
  const processedTitles = new Map<string, string>();
  validImages.forEach(image => {
    // Store by image.id -> processedTitle
    processedTitles.set(image.id, truncateImageTitle(image.alt));
  });
  console.timeEnd('[GroupingWorker] precompute titles');

  console.time('[GroupingWorker] grouping loop');
  const groups: { [key: string]: ImageInfo[] } = {};
  validImages.forEach(image => {
    const processedTitle = processedTitles.get(image.id) || 'Untitled'; // Get pre-computed title
    if (!groups[processedTitle]) {
      groups[processedTitle] = [];
    }
    groups[processedTitle].push(image);
  });
  console.timeEnd('[GroupingWorker] grouping loop');

  console.time('[GroupingWorker] convert to array');
  const result = Object.entries(groups).map(([key, group]) => ({
    key, // Use the truncated title as the key
    images: group,
    isCarousel: group.length > 1,
  }));
  console.timeEnd('[GroupingWorker] convert to array');
  // --- End Optimized Grouping Logic ---

  console.timeEnd('[GroupingWorker] performGrouping');
  return result;
};

// --- Worker Message Handling (Updated) ---
self.onmessage = (event: MessageEvent<GroupingRequest>) => {
  // Destructure the full message
  const { type, payload, requestId } = event.data;

  // Check if it's the expected message type (optional but good practice)
  if (type !== 'groupImages') {
    console.warn(`[GroupingWorker] Received unexpected message type: ${type}`);
    // Optionally send an error response back
    const errorResponse: GroupingErrorResponse = {
      type: 'error',
      message: `Unexpected message type: ${type}`,
      requestId: requestId, // Include ID if available
    };
    self.postMessage(errorResponse);
    return;
  }

  // Extract data from payload
  const { images, isGrouped } = payload;

  console.log(`[GroupingWorker] Received request ${requestId}. Grouping: ${isGrouped}`);

  if (!images || !requestId) {
    console.error(
      '[GroupingWorker] Invalid data received (missing images or requestId):',
      event.data
    );
    // Send error back with requestId if possible
    const errorResponse: GroupingErrorResponse = {
      type: 'error',
      message: 'Invalid data received (missing images or requestId)',
      requestId: requestId, // Include ID if available
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    console.time(`[GroupingWorker] performGrouping ${requestId}`);
    const calculatedGroupedImages = performGrouping(images, isGrouped);
    console.timeEnd(`[GroupingWorker] performGrouping ${requestId}`);

    // Construct the success response with payload and requestId
    const resultPayload: GroupingResultPayload = {
      groupedImages: calculatedGroupedImages,
    };
    const response: GroupingResponse = {
      type: 'groupingResult', // Consistent response type
      payload: resultPayload,
      requestId: requestId, // Include the original request ID
    };
    self.postMessage(response);
  } catch (error) {
    console.error(`[GroupingWorker] Error during grouping for request ${requestId}:`, error);
    // Construct the error response with message and requestId
    const errorResponse: GroupingErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      requestId: requestId, // Include the original request ID
    };
    self.postMessage(errorResponse);
  }
};

console.log('[GroupingWorker] Initialized and ready for requests.');

// Generic error handler (less likely to be hit with specific try/catch)
self.onerror = event => {
  console.error('[GroupingWorker] Unhandled error:', event);
  // We don't have a requestId here, so we can't easily correlate
  // The pool's generic onerror handler might catch this
};

export {}; // Make this a module
