import { useEffect, useMemo, useRef } from 'react';
import { ImageInfo } from '../types';
import WorkerPool from '../workers/workerPool';

// ---> Refactored Options
interface PrefetchManagerOptions {
  imageList: ImageInfo[];
  prefetchTargetRange: [number, number] | null;
  concurrency?: number;
}
// <--- End Refactored Options

// ---> Default concurrency
const DEFAULT_CONCURRENCY = 3;
// <--- End Default concurrency

export function usePrefetchManager({
  imageList,
  prefetchTargetRange,
  concurrency = DEFAULT_CONCURRENCY,
}: PrefetchManagerOptions) {
  // ---> Keep WorkerPool and ImageProcessor access
  const workerPool = useMemo(() => WorkerPool.getInstance(), []);
  const imageProcessor = useMemo(() => workerPool.getImageProcessor(), [workerPool]);
  // <--- End WorkerPool access

  // ---> Keep processingRef for concurrency control
  const processingRef = useRef<Set<string>>(new Set());
  // <--- End processingRef

  // ---> Core Prefetching Effect based on Target Range
  useEffect(() => {
    // Exit if no range, no images, or no processor
    if (!prefetchTargetRange || !imageList || imageList.length === 0 || !imageProcessor) {
      // Optionally clear processingRef if range becomes null?
      // processingRef.current.clear(); // Consider if needed
      return;
    }

    const [startIndex, endIndex] = prefetchTargetRange;

    // Clamp range just in case (though ImageFeed should already do this)
    const clampedStartIndex = Math.max(0, startIndex);
    const clampedEndIndex = Math.min(imageList.length - 1, endIndex);

    if (clampedStartIndex > clampedEndIndex) {
      return; // Invalid range after clamping
    }

    // console.log(`[PrefetchManager] Processing range [${clampedStartIndex}, ${clampedEndIndex}]`);

    let processedCount = 0;
    const candidates: ImageInfo[] = [];
    for (let i = clampedStartIndex; i <= clampedEndIndex; i++) {
      candidates.push(imageList[i]);
    }

    // Prioritize candidates closer to the visible edge? (Optional enhancement later)
    // For now, process in order within the range respecting concurrency

    for (const candidate of candidates) {
      // Basic check for candidate validity
      if (!candidate || !candidate.id) {
        console.warn('[PrefetchManager] Skipping invalid candidate:', candidate);
        continue;
      }

      // Limit concurrency
      if (processedCount >= concurrency) {
        // console.log('[PrefetchManager] Concurrency limit reached.');
        break;
      }

      // Check if already processing this specific image ID
      if (processingRef.current.has(candidate.id)) {
        // console.log(`[PrefetchManager] Skipping already processing ID: ${candidate.id}`);
        continue;
      }

      console.log(`[PrefetchManager] Requesting predictive processing for ${candidate.id}`);
      processingRef.current.add(candidate.id);
      processedCount++;

      // Call the image processor (fire and forget, handle errors internally)
      imageProcessor
        .processImage(candidate)
        .catch(err => {
          // Log error, but don't necessarily stop other prefetches
          console.error(`[PrefetchManager] Predictive processing failed for ${candidate.id}:`, err);
        })
        .finally(() => {
          // Important: Remove ID from the set when done/failed
          processingRef.current.delete(candidate.id);
        });
    }

    // No cleanup function needed here as requests are fire-and-forget
    // and processingRef handles avoiding duplicates.
  }, [prefetchTargetRange, imageList, imageProcessor, concurrency]); // Dependencies drive the effect
  // <--- End Core Prefetching Effect

  // Return value not strictly needed, but could return stats later if useful
  // return { processingCount: processingRef.current.size };
}
