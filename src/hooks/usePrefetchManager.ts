import throttle from 'lodash/throttle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Range, RangeSet } from 'tree-range-set';
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

  // Refs for the RangeSet
  const rangeSetRef = useRef<RangeSet<number> | null>(null);
  // Use string key: "lower-upper"
  const rangeToIdMapRef = useRef<Map<string, string> | null>(null);

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
    const currentRangeSet = rangeSetRef.current;
    const currentRangeToIdMap = rangeToIdMapRef.current;

    // Check if essential refs or data are missing
    if (
      !scrollContainerRef.current ||
      imageList.length === 0 ||
      !currentRangeSet ||
      !currentRangeToIdMap ||
      currentRangeSet.isEmpty
    ) {
      // console.log('[PrefetchManager] Skipping logic: Missing container, imageList, or RangeSet not ready/empty.');
      return;
    }

    // Phase 3: Query the RangeSet
    const prefetchTop = Math.max(0, currentViewport.top - lookaheadDistance);
    const prefetchBottom = currentViewport.bottom + lookaheadDistance;
    const queryRange = Range.closeOpen(prefetchTop, prefetchBottom);

    let intersectingRanges: Range<number>[] = [];
    try {
      // Use subranges property suggested by linter
      const allRanges = currentRangeSet.subranges; // Access as property
      // We need to filter this array based on the queryRange using intersection
      intersectingRanges = allRanges.filter(range => range.intersection(queryRange));

      // console.log(`[PrefetchManager] Found ${intersectingRanges.length} intersecting ranges.`);
    } catch (error) {
      console.error('[PrefetchManager] Error querying RangeSet:', error);
      return; // Stop if query fails
    }

    if (intersectingRanges.length === 0) {
      // console.log('[PrefetchManager] No intersecting ranges found for query.');
      return; // No candidates found
    }

    // Phase 4: Map Query Results and Calculate Priorities
    const candidates: PrefetchCandidate[] = [];
    for (const resultRange of intersectingRanges) {
      // Recreate the string key to look up the ID
      const rangeKey = `${resultRange.lower}-${resultRange.upper}`;
      const imageId = currentRangeToIdMap.get(rangeKey);
      if (!imageId) {
        // Update warning message slightly
        console.warn(`[PrefetchManager] Could not find ID for range key: ${rangeKey}`, resultRange);
        continue; // Skip if mapping fails
      }

      // Use the original layoutData prop, as received by the hook
      const layout = layoutData.get(imageId);
      if (!layout) {
        console.warn(`[PrefetchManager] Could not find layout data for image ${imageId}`);
        continue; // Skip if layout missing
      }

      // Find the original ImageInfo object using the ID from the imageList prop
      const imageInfo = imageList.find(img => img.id === imageId);
      if (!imageInfo) {
        console.warn(`[PrefetchManager] Could not find image info for image ${imageId}`);
        continue; // Skip if image info missing
      }

      // Calculate priority using the existing function and retrieved data
      const priority = calculatePriority(imageInfo, layout);

      // Add to candidates using the structure defined in PrefetchCandidate
      candidates.push({ ...imageInfo, priority, layout });
    }

    // --- Keep existing sorting and processing logic ---
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
    viewport,
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

  // Effect 2: Run prefetch logic when core data changes (images, layout) - NOW BUILDS RangeSet
  useEffect(() => {
    if (!layoutData || layoutData.size === 0) {
      rangeSetRef.current = null;
      rangeToIdMapRef.current = null;
      console.log('[PrefetchManager] Cleared RangeSet due to empty layout data.');
      return;
    }

    console.log(`[PrefetchManager] Rebuilding RangeSet for ${layoutData.size} items...`);
    const newRangeSet = RangeSet.numeric(); // Use numeric spec for pixel values
    const newRangeToIdMap = new Map<string, string>(); // Key is string, Value is string (ID)

    try {
      // Use layoutData prop as received by the hook
      for (const [id, layout] of layoutData.entries()) {
        // Ensure layout has valid numeric properties
        if (
          typeof layout?.top === 'number' &&
          typeof layout?.height === 'number' &&
          layout.height > 0
        ) {
          // Use closeOpen [start, end) as it's common for interval trees
          const range = Range.closeOpen(layout.top, layout.top + layout.height);
          newRangeSet.add(range);
          // Use string key: "lower-upper"
          const rangeKey = `${range.lower}-${range.upper}`;
          newRangeToIdMap.set(rangeKey, id); // Map the string key to its ID
        } else {
          console.warn(`[PrefetchManager] Invalid layout data for image ${id}:`, layout);
        }
      }

      rangeSetRef.current = newRangeSet;
      rangeToIdMapRef.current = newRangeToIdMap;
      console.log('[PrefetchManager] RangeSet rebuild complete.');

      // Optional: Trigger a prefetch logic run immediately after rebuild?
      // runPrefetchLogicRef.current?.();
      // Decided against immediate trigger here to avoid potential complexity.
      // The existing scroll/resize listeners and initial data change trigger should cover it.
    } catch (error) {
      console.error('[PrefetchManager] Error building RangeSet:', error);
      rangeSetRef.current = null; // Clear on error
      rangeToIdMapRef.current = null;
    }
  }, [layoutData]); // Rebuild only when layout data changes

  // Effect 3: Run prefetch logic when imageList changes (less frequent but possible)
  // This is similar to the old Effect 2, but separated from the RangeSet build effect.
  useEffect(() => {
    // Only run if we have images and the range set is ready
    if (imageList.length > 0 && rangeSetRef.current) {
      console.log('[PrefetchManager] Running logic due to imageList change (with RangeSet ready).');
      // Directly call the latest logic function from the ref
      runPrefetchLogicRef.current?.();
    }
    // This effect should ONLY run when the image list changes.
    // It intentionally does *not* depend on layoutData or viewport.
  }, [imageList]);

  // No return value needed, the hook manages prefetching internally
}
