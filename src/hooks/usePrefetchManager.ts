import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageInfo } from '../types';
import WorkerPool from '../workers/workerPool';

interface PrefetchManagerOptions {
  scrollContainerRef: React.RefObject<HTMLElement>;
  imageList: ImageInfo[];
  layoutData: Map<string, { top: number; left: number; width: number; height: number }>; // Assuming layout data is available
  lookaheadDistance?: number; // Pixels or items? Let's start with pixels
  priorityThreshold?: number; // Minimum priority score to consider prefetching
  concurrency?: number; // How many items to prefetch concurrently
  throttleDelay?: number; // ms delay for scroll/resize events
}

interface PrefetchCandidate extends ImageInfo {
  priority: number;
  layout: { top: number; left: number; width: number; height: number };
}

const DEFAULT_LOOKAHEAD = 600; // Look ahead 600px beyond viewport
const DEFAULT_CONCURRENCY = 3; // Prefetch up to 3 items at once
const DEFAULT_THROTTLE_DELAY = 50; // Throttle event handling to 50ms (was 100ms)

export function usePrefetchManager({
  scrollContainerRef,
  imageList,
  layoutData,
  lookaheadDistance = DEFAULT_LOOKAHEAD,
  concurrency = DEFAULT_CONCURRENCY,
  throttleDelay = DEFAULT_THROTTLE_DELAY,
}: PrefetchManagerOptions) {
  const workerPool = WorkerPool.getInstance();
  const imageProcessor = workerPool.getImageProcessor();
  const [viewport, setViewport] = useState({ top: 0, bottom: 0, height: 0 });
  const processingRef = useRef<Set<string>>(new Set());

  // Ref to store the latest version of the logic function for the throttled call
  const runPrefetchLogicRef = useRef<() => Promise<void>>();

  const updateViewport = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, clientHeight } = container;
    const currentTop = scrollTop;
    const currentBottom = scrollTop + clientHeight;
    // Use functional update to potentially avoid depending on viewport in useCallback
    setViewport(prev => ({ top: currentTop, bottom: currentBottom, height: clientHeight }));
  }, [scrollContainerRef]);

  const calculatePriority = useCallback(
    (
      image: ImageInfo,
      imageLayout: { top: number; left: number; width: number; height: number }
    ): number => {
      const imageCenterY = imageLayout.top + imageLayout.height / 2;
      // Read viewport directly from state here
      const viewportCenterY = viewport.top + viewport.height / 2;
      const distance = Math.abs(imageCenterY - viewportCenterY);
      return distance;
    },
    [viewport] // Dependency on viewport state is correct here
  );

  // Define the core logic function - this will be updated in the ref
  const runPrefetchLogicAsyncInternal = useCallback(async () => {
    // Read viewport state *inside* the function instead of relying on useCallback capture
    const currentViewport = viewport;
    if (!scrollContainerRef.current || imageList.length === 0 || layoutData.size === 0) {
      return;
    }

    const candidates: PrefetchCandidate[] = [];
    const prefetchTop = Math.max(0, currentViewport.top - lookaheadDistance);
    const prefetchBottom = currentViewport.bottom + lookaheadDistance;

    for (const image of imageList) {
      const imageLayout = layoutData.get(image.id);
      if (!imageLayout) continue;
      const imageTop = imageLayout.top;
      const imageBottom = imageLayout.top + imageLayout.height;
      if (imageBottom >= prefetchTop && imageTop <= prefetchBottom) {
        // Use the calculatePriority function (which depends on current viewport state)
        const priority = calculatePriority(image, imageLayout);
        candidates.push({ ...image, priority, layout: imageLayout });
      }
    }

    candidates.sort((a, b) => a.priority - b.priority);

    let processedCount = 0;
    for (const candidate of candidates) {
      if (processedCount >= concurrency) break;
      if (processingRef.current.has(candidate.id)) continue;

      console.log(
        `[PrefetchManager] Requesting process for ${candidate.id}, Priority: ${candidate.priority.toFixed(0)}`
      );
      processingRef.current.add(candidate.id);
      processedCount++;

      imageProcessor
        .processImage(candidate)
        .catch(err => {
          console.error(`[PrefetchManager] Error processing ${candidate.id}:`, err);
        })
        .finally(() => {
          processingRef.current.delete(candidate.id);
        });
    }
  }, [
    // Dependencies that define the logic: Stable references or core data
    imageList,
    layoutData,
    lookaheadDistance,
    concurrency,
    imageProcessor, // Assumed stable instance from WorkerPool
    calculatePriority, // This function still changes when viewport changes, but runPrefetchLogicAsyncInternal doesn't directly depend on viewport state anymore
    scrollContainerRef,
    // REMOVED viewport dependency
  ]);

  // Update the ref whenever the internal logic function changes
  useEffect(() => {
    runPrefetchLogicRef.current = runPrefetchLogicAsyncInternal;
  }, [runPrefetchLogicAsyncInternal]);

  // Create the throttled function once, calling the function from the ref
  const throttledRunPrefetch = useMemo(
    () =>
      throttle(() => {
        // Added check: only run if the ref is current and component is mounted
        if (runPrefetchLogicRef.current) {
          runPrefetchLogicRef.current();
        }
      }, throttleDelay),
    [throttleDelay]
  );

  // --- Effects ---

  // Effect 1: Setup listeners and initial viewport
  useEffect(() => {
    // Initial viewport update on mount
    updateViewport();

    const container = scrollContainerRef.current;
    if (container) {
      // Attach the stable throttled listener
      container.addEventListener('scroll', throttledRunPrefetch, { passive: true });
      // Optional: Add resize listener if needed
      // const handleResize = () => { updateViewport(); throttledRunPrefetch(); };
      // window.addEventListener('resize', handleResize);
    }

    return () => {
      throttledRunPrefetch.cancel();
      if (container) {
        container.removeEventListener('scroll', throttledRunPrefetch);
        // window.removeEventListener('resize', handleResize);
      }
    };
    // Dependencies: only need things required for setup/cleanup
  }, [scrollContainerRef, updateViewport, throttledRunPrefetch]);

  // Effect 2: Run prefetch logic when core data changes (images, layout)
  useEffect(() => {
    // Only run if we have images and layout data
    // This prevents running unnecessarily when transitioning to empty state
    if (imageList.length > 0 && layoutData.size > 0) {
      console.log('[PrefetchManager] Running logic due to imageList/layoutData change.');
      // Directly call the latest logic function from the ref
      runPrefetchLogicRef.current?.();
    }
    // This effect should ONLY run when the core data list/layout changes.
    // It intentionally does *not* depend on viewport or functions derived from it.
  }, [imageList, layoutData]); // Removed runPrefetchLogicAsyncInternal dependency

  // No return value needed, the hook manages prefetching internally
}
