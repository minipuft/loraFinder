import RBush from 'rbush';
import { useEffect, useMemo, useRef } from 'react';
import { ImageInfo } from '../types';
import MaxHeap from '../utils/MaxHeap.js';
import { calculatePriority } from '../utils/priorityCalculator.js';
import WorkerPool from '../workers/workerPool';
// Placeholder: Assume these exist and provide necessary data/functionality
// import { useViewport } from '../contexts/ViewportContext'; // Example context

// Define the structure for items stored in the R-tree
interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

// Define BBox type for spatial queries
export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ---> Refactored Options
interface PrefetchManagerOptions {
  imageList: ImageInfo[];
  prefetchTargetRange: [number, number] | null;
  layoutDataMap: Map<string, { top: number; left: number; width: number; height: number }>;
  feedCenter: { x: number; y: number };
  containerWidth: number; // Width of the scroll container for 2D queries
  concurrency?: number;
}
// <--- End Refactored Options

// ---> Default concurrency
const DEFAULT_CONCURRENCY = 3;
// <--- End Default concurrency

export function usePrefetchManager({
  imageList,
  prefetchTargetRange,
  layoutDataMap,
  feedCenter,
  containerWidth,
  concurrency = DEFAULT_CONCURRENCY,
}: PrefetchManagerOptions) {
  // Refs for R-Tree and direct ImageInfo lookup
  const rTreeRef = useRef<RBush<SpatialItem> | null>(null);
  const imageInfoMapRef = useRef<Map<string, ImageInfo>>(new Map());

  // ---> Keep WorkerPool and ImageProcessor access
  const workerPool = useMemo(() => WorkerPool.getInstance(), []);
  const imageProcessor = useMemo(() => workerPool.getImageProcessor(), [workerPool]);
  // <--- End WorkerPool access

  // ---> Keep processingRef for concurrency control
  const processingRef = useRef<Set<string>>(new Set());
  // <--- End processingRef

  // Effect to update the ImageInfo map whenever the imageList changes
  useEffect(() => {
    const newMap = new Map<string, ImageInfo>();
    if (imageList && imageList.length) {
      imageList.forEach(image => {
        if (image.id) {
          newMap.set(image.id, image);
        }
      });
    }
    imageInfoMapRef.current = newMap;
    // console.log(`[PrefetchManager] imageInfoMapRef updated with ${newMap.size} entries.`);
  }, [imageList]);

  // Build numeric RangeSet on layout changes
  useEffect(() => {
    if (!layoutDataMap || layoutDataMap.size === 0) {
      rTreeRef.current = null;
      return;
    }
    // Build new R-Tree instance and bulk-load spatial items
    const tree = new RBush<SpatialItem>();
    const itemsToLoad: SpatialItem[] = [];
    layoutDataMap.forEach((rect, id) => {
      itemsToLoad.push({
        minX: rect.left,
        minY: rect.top,
        maxX: rect.left + rect.width,
        maxY: rect.top + rect.height,
        id,
      });
    });
    tree.load(itemsToLoad);
    rTreeRef.current = tree;
  }, [layoutDataMap]);

  // Add function to find nearby items using R-tree spatial query
  const findNearbyItems = (queryBox: BBox, excludeId?: string): SpatialItem[] => {
    const tree = rTreeRef.current;
    if (!tree || queryBox.maxX < queryBox.minX || queryBox.maxY < queryBox.minY) {
      return [];
    }

    try {
      // Perform the spatial query
      const hits = tree.search(queryBox);

      // Filter out the item being dragged if excludeId is provided
      if (excludeId) {
        return hits.filter(item => item.id !== excludeId);
      }

      return hits;
    } catch (error) {
      console.error('[PrefetchManager] Error searching R-Tree:', error);
      return [];
    }
  };

  // ---> Core Prefetching Effect based on Target Range
  useEffect(() => {
    if (
      !prefetchTargetRange ||
      !imageList ||
      imageList.length === 0 ||
      !imageProcessor ||
      !imageInfoMapRef.current || // Check if map is populated
      imageInfoMapRef.current.size === 0
    ) {
      return;
    }

    // Try using the R-Tree for spatial query
    const tree = rTreeRef.current;
    let selectedCandidates: ImageInfo[] = [];

    if (tree && containerWidth > 0) {
      const [startIdx, endIdx] = prefetchTargetRange;
      const startImg = imageList[startIdx];
      const endImg = imageList[endIdx];

      if (startImg?.id && endImg?.id) {
        const startRect = layoutDataMap.get(startImg.id);
        const endRect = layoutDataMap.get(endImg.id);

        if (startRect && endRect) {
          // Define the 2D query box based on vertical range + container width
          const queryBox = {
            minX: 0, // Assuming feed starts at left edge
            minY: startRect.top,
            maxX: containerWidth,
            maxY: endRect.top + endRect.height,
          };

          // Ensure valid box before querying
          if (queryBox.maxY >= queryBox.minY && queryBox.maxX >= queryBox.minX) {
            try {
              const hits = tree.search(queryBox);
              const hitIds = hits.map(hit => hit.id);
              // Phase 4a: Map hits to ImageInfo using the efficient map
              selectedCandidates = hitIds
                .map(id => imageInfoMapRef.current.get(id))
                .filter((img): img is ImageInfo => Boolean(img)); // Type guard for filtering nulls
              // console.log(`[PrefetchManager] R-Tree query hit ${hits.length} items.`);
            } catch (error) {
              console.error('[PrefetchManager] Error searching R-Tree:', error);
              // Fallback will be handled below
            }
          }
        }
      }
    }

    // Phase 4b: Fallback to full velocity-based slice if R-Tree fails or yields no candidates
    if (selectedCandidates.length === 0) {
      // console.log('[PrefetchManager] Falling back to index slice for candidates.');
      const [startIdx, endIdx] = prefetchTargetRange;
      // TODO: Verify fallback logic. prefetchTargetRange contains *row* indices.
      // Slicing imageList directly with row indices might be incorrect.
      // Consider mapping row indices back to approximate image indices if possible.
      selectedCandidates = imageList.slice(startIdx, Math.min(endIdx + 1, imageList.length)); // Ensure slice end is valid
    }

    // --- Start Heap Logic ---
    // Use a MaxHeap based on priority (lower number = higher priority)
    // So the heap keeps the items with the LARGEST priority values (worst candidates)
    // We want to replace the largest priority if a smaller one comes along.
    const candidateHeap = new MaxHeap<{
      priority: number;
      image: ImageInfo;
    }>(
      (
        a: { priority: number; image: ImageInfo },
        b: { priority: number; image: ImageInfo }
      ): number => a.priority - b.priority,
      concurrency
    );

    for (let i = 0; i < selectedCandidates.length; i++) {
      const candidateImage = selectedCandidates[i];
      if (!candidateImage || !candidateImage.id) continue;

      // Calculate priority based on layout position and feed center
      const layoutRect = layoutDataMap.get(candidateImage.id);
      if (!layoutRect) continue;
      const priority = calculatePriority(layoutRect, feedCenter);

      candidateHeap.push({ priority, image: candidateImage });
    }

    const selectedCandidatesHeap = candidateHeap
      .getItems()
      .map((item: { priority: number; image: ImageInfo }): ImageInfo => item.image);
    // --- End Heap Logic ---

    // --- Process Selected Candidates ---
    let processedCount = 0;
    // console.log(`[PrefetchManager] Top ${selectedCandidates.length} candidates selected by priority.`);

    // Replace the simple iteration with iteration over selected candidates
    for (const candidate of selectedCandidatesHeap) {
      // Basic check (already done in loop above, but belt-and-suspenders)
      if (!candidate || !candidate.id) {
        console.warn('[PrefetchManager] Skipping invalid selected candidate:', candidate);
        continue;
      }

      // Concurrency limit check (redundant now as heap size = concurrency)
      // if (processedCount >= concurrency) break; // Should not be hit

      // Check if already processing
      if (processingRef.current.has(candidate.id)) {
        // console.log(`[PrefetchManager] Skipping already processing ID: ${candidate.id}`);
        continue;
      }

      console.log(`[PrefetchManager] Requesting priority processing for ${candidate.id}`);
      processingRef.current.add(candidate.id);
      processedCount++; // Track count just in case, though should match heap size

      // Call the image processor
      imageProcessor
        .processImage(candidate)
        .catch(err => {
          console.error(`[PrefetchManager] Priority processing failed for ${candidate.id}:`, err);
        })
        .finally(() => {
          processingRef.current.delete(candidate.id);
        });
    }
    // --- End Processing ---

    // No cleanup function needed here as requests are fire-and-forget
    // and processingRef handles avoiding duplicates.
  }, [
    prefetchTargetRange,
    imageList,
    imageProcessor,
    concurrency,
    layoutDataMap,
    feedCenter,
    containerWidth, // Added dependency
    // No need for rTreeRef or imageInfoMapRef here as they are stable refs
  ]);
  // <--- End Core Prefetching Effect

  // Return findNearbyItems and any other state/functions that might be useful
  return {
    findNearbyItems,
    processingCount: processingRef.current.size,
  };
}
