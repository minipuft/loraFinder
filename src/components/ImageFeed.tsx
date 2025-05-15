import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { throttle as lodashThrottle } from 'lodash';
import React, {
  CSSProperties,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/plugins/counter.css';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { useAnimationPipeline } from '../animations/AnimationManager';
import { GroupingAnimator } from '../animations/presets/GroupingAnimator';
import { useAppSettings } from '../contexts';
import { ColorContext, ImagePalette } from '../contexts/ColorContext';
import { DragProvider } from '../contexts/DragContext';
import { useImageFeedCenter } from '../contexts/ImageFeedCenterContext';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
import { useFolderImages } from '../hooks/query/useFolderImages';
import { useAnimationCoordinator } from '../hooks/useAnimationCoordinator';
import { useImageOrderManager } from '../hooks/useImageDragDrop';
import { usePrefetchManager } from '../hooks/usePrefetchManager';
import usePrevious from '../hooks/usePrevious';
import useWindowSize from '../hooks/useWindowSize';
import { loadScrollState, saveScrollState, ScrollState } from '../lib/cache/feedStateCache';
import styles from '../styles/ImageFeed.module.scss';
import type { AnimationSequenceConfig, ImageInfo } from '../types';
import { ViewMode } from '../types';
import AnimationUtils from '../utils/AnimationUtils';
import { Rect } from '../utils/intersectionUtils';
import {
  calculateGapSize,
  calculateLayout,
  LayoutConfig,
  MIN_IMAGE_WIDTH,
  RowConfig,
} from '../utils/layoutCalculator';
import WorkerPool, { WorkerType } from '../workers/workerPool';
import ErrorBoundary from './ErrorBoundary';
import ImageRow from './ImageRow';
import { LazyBannerView, LazyCarouselView, LazyMasonryView } from './lazy/lazyWidgets';
import Spinner from './lazy/Spinner';

// Simple debounce function (with cancel)
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitFor);
  };

  // Add the cancel method
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null; // Clear the ID after cancelling
    }
  };

  return debounced as F & { cancel: () => void };
}

// Add this custom hook for debounced memo operations
// This helps prevent excessive calculations during frequent state changes like dragging
function useDebouncedMemo<T>(factory: () => T, deps: React.DependencyList, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(factory());
  const previousValueRef = useRef<T>(debouncedValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      const newValue = factory();
      previousValueRef.current = newValue;
      setDebouncedValue(newValue);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  // Return the immediate value for first render, but debounced value for subsequent ones
  return debouncedValue;
}

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  scrollContainerRef: React.RefObject<HTMLElement>;
}

interface CustomStyle extends CSSProperties {
  '--energy-color'?: string;
  '--ripple-x'?: string;
  '--ripple-y'?: string;
  '--ripple-strength'?: string;
}

// Interface for messages from ColorExtractorWorker
interface ColorResultData {
  id: string;
  color: string | null;
}

// Interface for messages from GroupingWorker
interface ImageGroup {
  key: string;
  images: ImageInfo[];
  isCarousel: boolean;
}
interface GroupingResultData {
  groupedImages: ImageGroup[];
}

// Define payload TYPESCRIPT INTERFACES for worker requests if needed for clarity,
// but use component's internal types for results where appropriate.
interface GroupingRequestPayload {
  images: ImageInfo[];
  isGrouped: boolean;
}
interface LayoutRequestPayload {
  images: ImageInfo[];
  containerWidth: number;
  zoom: number;
  targetRowHeight: number;
}
interface ColorRequestPayload {
  id: string;
  src: string;
}
// Define the TYPE for the expected successful PAYLOAD from the color worker
// Align this with what the color worker actually sends back in its payload
interface ColorWorkerSuccessPayload {
  id: string;
  palette: ImagePalette | null;
}

// Define interface for potential drop target
interface PotentialDropTarget {
  targetId: string;
  position: 'before' | 'after';
  rowIndex?: number;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({ scrollContainerRef }) => {
  // Consume context
  const { selectedFolder: folderPath, isGrouped, zoom, viewMode } = useAppSettings();
  const { setImageFeedCenter } = useImageFeedCenter();

  // --- EARLY EXIT if folderPath is invalid --- >
  if (!folderPath || typeof folderPath !== 'string' || folderPath.trim() === '') {
    console.warn('[ImageFeed] Render skipped: Invalid folderPath received.');
    // Optionally render a placeholder or null, or a specific message
    // Render null for now, parent component should handle loading state
    return null;
  }

  console.log('[ImageFeed] Render - isGrouped prop:', isGrouped);
  const { data: originalImages, isError, error } = useFolderImages(folderPath);

  const windowSize = useWindowSize();
  const feedRef = useRef<HTMLDivElement>(null);
  const groupingAnimatorRef = useRef<GroupingAnimator | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(4);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);
  const animationUtils = useMemo(() => AnimationUtils.getInstance(), []);
  const { setImagePalette } = useContext(ColorContext);
  const [imagePaletteMap, setImagePaletteMap] = useState<Map<string, ImagePalette | null>>(
    new Map()
  );
  const requestedColorIds = useRef<Set<string>>(new Set());
  const [restoredState, setRestoredState] = useState<ScrollState | null>(null);
  const previousFolderPathRef = useRef<string | null>(null);
  const rowHeightsRef = useRef<number[]>([]);
  const rowRectsMapRef = useRef<Map<number, Rect>>(new Map());
  const isRestoringScrollRef = useRef(false);
  const velocityEMARef = useRef(0);
  const OVERSCAN_BASE = 3;
  const OVERSCAN_MAX = 15;
  const EMA_ALPHA = 0.2;
  const OVERSCAN_FACTOR = 10;
  const PREFETCH_LOOKAHEAD_FACTOR = 15; // Items per unit of velocity (needs tuning)
  const MAX_PREFETCH_ITEMS = 20; // Max number of items to prefetch in one go
  const [dynamicOverscan, setDynamicOverscan] = useState(OVERSCAN_BASE);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const { publishImageUpdate } = useImageProcessing();
  const [animatedRowIndices, setAnimatedRowIndices] = useState<Set<number>>(new Set());
  const prevIsGrouped = usePrevious(isGrouped);
  const exitResolverRef = useRef<(() => void) | null>(null);
  const [prefetchTargetRange, setPrefetchTargetRange] = useState<[number, number] | null>(null);
  const [calculatedRows, setCalculatedRows] = useState<RowConfig[]>([]);
  const [isLayoutCalculating, setIsLayoutCalculating] = useState(false);
  const [processedGroupedImages, setProcessedGroupedImages] = useState<ImageGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const activeRequestRef = useRef<{ [key in WorkerType]?: boolean }>({});

  // Refs for previous layout state comparison
  const prevContainerWidthRef = useRef<number>(containerWidth);
  const prevZoomRef = useRef<number>(zoom);
  const prevOrderedImageIdsRef = useRef<string[]>([]);
  const prevDebouncedIsGroupedRef = useRef<boolean>(isGrouped);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before activation
      },
    })
  );

  // Reset animated rows when folder changes
  useEffect(() => {
    setAnimatedRowIndices(new Set());
  }, [folderPath]);

  // --- Define getImageUrl earlier --- >
  const getImageUrl = useCallback((imagePath: string) => {
    let path = imagePath.replace(/\\/g, '/');
    if (path.startsWith('/api/image/') || path.startsWith('/')) {
      return path;
    }
    return `/api/image/${path}`;
  }, []); // Empty dependency array, safe to define early

  // --- Memoized Images & Failed Image Handling --- >
  const images = useMemo(() => {
    if (!originalImages) return [];
    return originalImages.filter(img => img && !failedImageIds.has(img.id));
  }, [originalImages, failedImageIds]);

  // Restore handleImageLoadError here
  const handleImageLoadError = useCallback((imageId: string) => {
    setFailedImageIds(prev => {
      if (prev.has(imageId)) return prev;
      console.log(`ImageFeed: Registering error for image ${imageId}`);
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []); // <-- Add setFailedImageIds dependency if lint complains later

  // --- Worker Pool --- >
  const workerPool = useMemo(() => WorkerPool.getInstance(), []);

  // --- Layout Data Map and Row Rects Calculation ---
  const layoutDataMap = useMemo(() => {
    const map = new Map<string, { top: number; left: number; width: number; height: number }>();
    const rowRectsMap = new Map<number, Rect>(); // Create map for this calculation cycle
    let currentTop = 0;
    const gap = calculateGapSize(zoom);

    if (calculatedRows && calculatedRows.length > 0) {
      calculatedRows.forEach((row, rowIndex) => {
        let currentLeft = 0;
        let minRowTop = currentTop;
        let maxRowBottom = currentTop + row.height;
        let minRowLeft = Infinity;
        let maxRowRight = 0;

        row.images.forEach((img, index) => {
          if (!row.imageWidths || row.imageWidths.length <= index) {
            console.warn(`[ImageFeed] Missing imageWidths for image ${img.id} in row.`);
            return; // Skip this image if width data is missing
          }
          const width = row.imageWidths[index];
          const itemLayout = {
            top: currentTop,
            left: currentLeft,
            width: width,
            height: row.height,
          };
          map.set(img.id, itemLayout);

          // Update row bounds
          minRowLeft = Math.min(minRowLeft, currentLeft);
          maxRowRight = Math.max(maxRowRight, currentLeft + width);

          currentLeft += width + gap;
        });

        // Store the calculated rectangle for the entire row
        if (row.images.length > 0) {
          // Only add if row has items
          rowRectsMap.set(rowIndex, {
            top: minRowTop,
            left: minRowLeft,
            width: maxRowRight - minRowLeft, // Calculate width from bounds
            height: row.height,
          });
        }

        currentTop += row.height + gap;
      });
    }
    console.log('[ImageFeed] layoutDataMap created, size:', map.size);
    // Update the ref with the newly calculated row rects
    rowRectsMapRef.current = rowRectsMap;
    return map;
  }, [calculatedRows, zoom]); // Keep dependencies simple

  // --- Feed Center Calculation ---
  // Calculate the center of the feed area based on its client rect.
  // Ensure it always returns a valid object, defaulting to {0, 0}
  const feedCenter = useMemo(() => {
    if (feedRef.current) {
      const rect = feedRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: 0, y: 0 }; // Default for internal use, context will get null if ref not ready
  }, [containerWidth, windowSize]);

  useEffect(() => {
    if (feedRef.current) {
      const rect = feedRef.current.getBoundingClientRect();
      setImageFeedCenter({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setImageFeedCenter(null); // Set context to null if feedRef is not available
    }
    // Optional: Cleanup function to set context to null on unmount
    return () => {
      // setImageFeedCenter(null);
    };
  }, [containerWidth, windowSize, setImageFeedCenter, folderPath]); // Re-calculate on container/window size change

  // --- Initialize (Refactored) Prefetch Manager ---
  const { findNearbyItems } = usePrefetchManager({
    imageList: images,
    layoutDataMap,
    feedCenter,
    prefetchTargetRange,
    containerWidth,
  });

  // --- Debouncing Logic for isGrouped ---
  const [debouncedIsGrouped, setDebouncedIsGrouped] = useState(isGrouped);
  const updateDebouncedGrouped = useCallback(
    // Use the local debounce function now
    debounce((newValue: boolean) => {
      setDebouncedIsGrouped(newValue);
      console.log('[ImageFeed] Applying debounced isGrouped:', newValue);
    }, 300), // 300ms debounce delay
    [] // No dependencies needed as debounce is defined outside/statically
  );
  useEffect(() => {
    updateDebouncedGrouped(isGrouped);
    // Access the cancel method correctly
    return () => updateDebouncedGrouped.cancel();
  }, [isGrouped, updateDebouncedGrouped]);

  // --- Scroll Persistence Logic ---

  // Debounced function to save scroll state during active scroll
  const debouncedSaveScroll = useCallback(
    debounce((path: string, scroll: number /*, heights: number[], width: number */) => {
      if (path && !isRestoringScrollRef.current) {
        saveScrollState(path, scroll);
      }
    }, 500),
    []
  );

  // Load state on mount/folder change & Save state on unmount/folder change
  useEffect(() => {
    let isMounted = true;

    const loadAndSetState = async () => {
      const loadedState = await loadScrollState(folderPath);
      if (isMounted) {
        if (loadedState) {
          setRestoredState(loadedState);
          isRestoringScrollRef.current = true;
        } else {
          setRestoredState(null);
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
          isRestoringScrollRef.current = false;
        }
      }
    };

    loadAndSetState();

    const currentPathForCleanup = folderPath;
    previousFolderPathRef.current = currentPathForCleanup;

    return () => {
      isMounted = false;
      const scrollElement = scrollContainerRef.current;
      const folderToSave = previousFolderPathRef.current;

      if (scrollElement && folderToSave && rowHeightsRef.current.length > 0) {
        saveScrollState(folderToSave, scrollElement.scrollTop);
      }

      debouncedSaveScroll.cancel?.();
      // --- Cancel All Pending Worker Tasks on Unmount --- >
      console.log('ImageFeed: Unmounting, cancelling all pending worker tasks.');
      workerPool.cancelAllPendingTasks();
      // No need to remove listeners here as they are not used for request/response
    };
  }, [
    folderPath,
    scrollContainerRef,
    debouncedSaveScroll,
    workerPool, // Add workerPool as dependency for cleanup
  ]);
  // --- End Scroll Persistence Logic ---

  // --- Compute Stable Keys for Memoization --- >
  const imagesKey = useMemo(() => images.map(i => i.id).join('|'), [images]);

  // --- Avg Aspect Ratio & Layout Metrics (unchanged) --- >
  const avgAspectRatio = useMemo(() => {
    if (!originalImages || originalImages.length === 0) return 1; // Default aspect ratio
    const validImages = originalImages.filter(img => img && img.width > 0 && img.height > 0);
    if (validImages.length === 0) return 1;
    const totalRatio = validImages.reduce((sum, img) => sum + img.width / img.height, 0);
    return totalRatio / validImages.length;
  }, [originalImages]);

  const layoutMetrics = useMemo(() => {
    const gapSize = calculateGapSize(zoom);
    let estimatedRowHeightFallback = 200; // Default
    if (containerWidth > 0 && columns > 0 && avgAspectRatio > 0) {
      const totalGapWidth = Math.max(0, columns - 1) * gapSize;
      const availableWidthForImages = Math.max(0, containerWidth - totalGapWidth);
      if (availableWidthForImages > 0) {
        const estimatedAvgImageWidth = availableWidthForImages / columns;
        estimatedRowHeightFallback = Math.max(
          50,
          Math.round(estimatedAvgImageWidth / avgAspectRatio)
        );
      }
    }
    return {
      gapSize,
      estimatedRowHeightFallback,
    };
  }, [containerWidth, columns, zoom, avgAspectRatio]);

  // --- Memoize Layout Inputs --- >
  const layoutInputs = useMemo(
    () => ({
      imagesKey,
      containerWidth,
      zoom,
      viewMode,
      isGrouped: debouncedIsGrouped,
      targetRowHeight: layoutMetrics.estimatedRowHeightFallback,
    }),
    [
      imagesKey,
      containerWidth,
      zoom,
      viewMode,
      debouncedIsGrouped,
      layoutMetrics.estimatedRowHeightFallback,
    ]
  );

  // --- UPDATED: Reset/Cancel Effect --- >
  useEffect(() => {
    setLightboxIndex(-1);
    setLightboxImages([]);
    setImagePaletteMap(new Map());
    requestedColorIds.current.clear();
    setFailedImageIds(new Set());
    setCalculatedRows([]);
    setIsLayoutCalculating(false); // Reset loading state
    setProcessedGroupedImages([]);
    setIsGrouping(false); // Reset loading state

    console.log(
      `ImageFeed: Deps changed (${folderPath}/${viewMode}/${isGrouped}/${zoom}), cancelling pending worker tasks.`
    );
    // Cancel tasks related to the previous state
    workerPool.cancelAllPendingTasks();
    activeRequestRef.current = {}; // Reset active request flags
  }, [folderPath, viewMode, isGrouped, zoom, workerPool]); // isGrouped and zoom trigger cancellation now

  // --- Container Width Management (UPDATED: Use debounce) --- >
  const updateContainerWidthInternal = useCallback(() => {
    if (!feedRef.current) return;
    const rect = feedRef.current.getBoundingClientRect();
    const newWidth = Math.max(MIN_IMAGE_WIDTH, rect.width);
    setContainerWidth(prevWidth => {
      if (newWidth !== prevWidth) {
        const config: LayoutConfig = {
          containerWidth: newWidth,
          zoom,
          viewMode,
          isGrouped: debouncedIsGrouped, // Use debounced value here
        };
        const layout = calculateLayout(config);
        setColumns(layout.columns);
        return newWidth;
      }
      return prevWidth;
    });
  }, [zoom, viewMode, debouncedIsGrouped]); // Keep dependencies of the internal logic

  // --- Memoize the debounced function --- >
  const debouncedUpdateContainerWidth = useMemo(
    () => debounce(updateContainerWidthInternal, 100), // 100ms debounce
    [updateContainerWidthInternal] // Recreate debounce only if internal logic changes
  );

  // --- Use the debounced function in effects --- >
  useLayoutEffect(() => {
    // Run immediately on mount
    updateContainerWidthInternal();
    // Ensure cleanup cancels the debounced call
    return () => debouncedUpdateContainerWidth.cancel();
  }, [updateContainerWidthInternal, debouncedUpdateContainerWidth]); // Add debounced func to deps

  useEffect(() => {
    const resizeObserver = new ResizeObserver(debouncedUpdateContainerWidth); // Use debounced version
    if (feedRef.current) {
      resizeObserver.observe(feedRef.current);
    }
    // Still use the debounced version for window resize
    window.addEventListener('resize', debouncedUpdateContainerWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedUpdateContainerWidth);
      debouncedUpdateContainerWidth.cancel(); // Cancel on unmount
    };
  }, [debouncedUpdateContainerWidth]); // Depend only on the stable debounced function reference
  // --- End Container Width Management ---

  // --- Effect for Pre-fetching Placeholder Colors (Now safe to use getImageUrl) --- >
  useEffect(() => {
    if (images && images.length > 0 /* && !isLoadingImages <- No longer available */) {
      const initialImageCount = Math.min(images.length, 30);
      console.log(`[ImageFeed] Pre-fetching colors for initial ${initialImageCount} images...`);

      for (let i = 0; i < initialImageCount; i++) {
        const imageInfo = images[i];
        if (
          imageInfo &&
          imageInfo.id &&
          imageInfo.src &&
          !imagePaletteMap.has(imageInfo.id) &&
          !requestedColorIds.current.has(imageInfo.id)
        ) {
          const imageUrl = getImageUrl(imageInfo.src); // Now defined
          requestedColorIds.current.add(imageInfo.id);
          // ... (rest of the postRequest logic)
          workerPool
            .postRequest<ColorRequestPayload, ColorWorkerSuccessPayload>(
              'color',
              'extractColor',
              { id: imageInfo.id, src: imageUrl },
              { priority: 2 }
            )
            .then(result => {
              if (result?.palette) {
                setImagePaletteMap(prevMap => new Map(prevMap).set(result.id, result.palette));
              }
            })
            .catch(error => {
              console.error(
                `[ImageFeed] Color worker request failed for initial image ID ${imageInfo.id}:`,
                error
              );
            })
            .finally(() => {
              requestedColorIds.current.delete(imageInfo.id);
            });
        }
      }
    }
  }, [images, workerPool, getImageUrl]); // Keep getImageUrl in deps

  // --- Initialize Virtualizer --- >
  const rowVirtualizer = useVirtualizer({
    count: calculatedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const rowHeight = calculatedRows[index]?.height ?? layoutMetrics.estimatedRowHeightFallback;
        return rowHeight + layoutMetrics.gapSize;
      },
      [calculatedRows, layoutMetrics.estimatedRowHeightFallback, layoutMetrics.gapSize]
    ),
    overscan: dynamicOverscan,
  });

  // --- Define Core Functions with useCallback --- >

  // Define fetchAndUpdateGroupedLayout (check dependencies carefully)
  const fetchAndUpdateGroupedLayout = useCallback(
    async (currentOrderedImages: ImageInfo[]) => {
      if (!currentOrderedImages || currentOrderedImages.length === 0 || containerWidth <= 0) {
        console.log('[ImageFeed] Skipping data fetch (no images or zero width).');
        setProcessedGroupedImages([]);
        setCalculatedRows([]);
        setIsGrouping(false);
        setIsLayoutCalculating(false);
        return;
      }

      setIsGrouping(true);
      if (viewMode === ViewMode.GRID) setIsLayoutCalculating(true);
      activeRequestRef.current = {};
      workerPool.cancelAllPendingTasks();

      try {
        let groupsToProcess: ImageGroup[];

        if (!debouncedIsGrouped) {
          console.log('[ImageFeed] Bypassing grouping worker for ungrouped view.');
          // Directly create groups for ungrouped view
          groupsToProcess = currentOrderedImages.map(img => ({
            key: img.id,
            images: [img],
            isCarousel: false, // Individual images are not carousels
          }));
          setProcessedGroupedImages(groupsToProcess);
          // setIsGrouping(false) will be called after this if/else block
        } else {
          // Original logic: Call grouping worker when isGrouped is true
          const groupingResult = await workerPool.postRequest<
            GroupingRequestPayload,
            { groupedImages: ImageGroup[] }
          >(
            'grouping',
            'groupImages',
            { images: currentOrderedImages, isGrouped: debouncedIsGrouped },
            { priority: 9 }
          );
          groupsToProcess = groupingResult.groupedImages;
          setProcessedGroupedImages(groupsToProcess);
        }

        // Grouping step (local or worker) is complete
        setIsGrouping(false);

        // Layout depends on groupsToProcess (either from local generation or worker)
        if (viewMode === ViewMode.GRID) {
          // setIsLayoutCalculating(true); // Already set optimistically if GRID view
          const firstImages = groupsToProcess
            .map(g => g.images[0])
            .filter(img => img && img.width > 0 && img.height > 0);

          if (firstImages.length > 0 && containerWidth > 0) {
            const layoutResult = await workerPool.postRequest<LayoutRequestPayload, RowConfig[]>(
              'layout',
              'calculateLayout',
              {
                images: firstImages,
                containerWidth,
                zoom,
                targetRowHeight: layoutMetrics.estimatedRowHeightFallback,
              },
              { priority: 10 }
            );
            setCalculatedRows(layoutResult);
          } else {
            setCalculatedRows([]);
          }
          setIsLayoutCalculating(false); // Layout for GRID is done or skipped
        } else {
          // Not GRID view, ensure layout states are reset
          setCalculatedRows([]);
          setIsLayoutCalculating(false);
        }
      } catch (error) {
        console.error('[ImageFeed] Error fetching grouped/layout data:', error);
        setProcessedGroupedImages([]);
        setCalculatedRows([]);
        setIsGrouping(false);
        setIsLayoutCalculating(false);
      }
    },
    [
      containerWidth,
      zoom,
      debouncedIsGrouped,
      viewMode,
      layoutMetrics.estimatedRowHeightFallback,
      workerPool,
      // State setters (setProcessedGroupedImages, setIsGrouping, etc.) are stable
    ]
  );

  // Define handleOrderChange (depends on rowVirtualizer and needs orderedImages)
  const handleOrderChangeCallback = useCallback(() => {
    console.log('[ImageFeed] Order changed callback, measure virtualizer...');
    // The actual fetch is triggered by the useEffect watching orderedImages
    rowVirtualizer?.measure();
  }, [rowVirtualizer]);

  // Instantiate the Order Manager Hook
  const { orderedImages, customImageOrder, setCustomImageOrder, resetImageOrder } =
    useImageOrderManager({
      initialImages: images,
      folderPath,
      onOrderChange: handleOrderChangeCallback, // Pass the stable callback
    });

  // Animation coordination hook for initial load animation
  const { triggerAnimation: triggerInitialLoadAnimation } =
    useAnimationCoordinator('image-feed-initial'); // Unique scope

  // Effect for triggering initial load animation
  useEffect(() => {
    // Only run when orderedImages is populated and not empty
    if (orderedImages && orderedImages.length > 0) {
      console.log('[ImageFeed] Triggering initial load animation via worker.');
      const config: AnimationSequenceConfig & { itemIds: string[] } = {
        id: `feed-load-${folderPath}-${Date.now()}`,
        itemIds: orderedImages.map(img => img.id), // Pass the current item IDs
        layoutMode: viewMode,
      };
      triggerInitialLoadAnimation(config);
    }
    // Trigger when folderPath or the resulting orderedImages change
  }, [orderedImages, folderPath, viewMode, triggerInitialLoadAnimation]);

  // Effect to run fetch when order changes OR other layout inputs change significantly
  useEffect(() => {
    if (viewMode !== ViewMode.GRID) return;

    // --- Redo comparison logic inside effect ---
    const currentWidth = containerWidth;
    const currentZoom = zoom;
    const currentImageIds = orderedImages.map(img => img.id);
    const currentIsGrouped = debouncedIsGrouped;

    const widthChangedSignificantly = Math.abs(currentWidth - prevContainerWidthRef.current) > 8;
    const zoomChangedSignificantly = Math.abs(currentZoom - prevZoomRef.current) > 0.01;
    const groupingChanged = currentIsGrouped !== prevDebouncedIsGroupedRef.current;
    const orderChanged =
      currentImageIds.length !== prevOrderedImageIdsRef.current.length ||
      currentImageIds.some((id, index) => id !== prevOrderedImageIdsRef.current[index]);
    const isInitialCalculation = calculatedRows.length === 0 && orderedImages.length > 0;

    // Define the condition for recalculating
    const shouldRecalculate =
      isInitialCalculation ||
      widthChangedSignificantly ||
      zoomChangedSignificantly ||
      groupingChanged ||
      orderChanged;

    console.log('[ImageFeed Layout Effect]', {
      /* ... logging object ... */
    });

    // --- Use the actual condition --- >
    if (shouldRecalculate) {
      console.log(
        '[ImageFeed Layout Effect] Conditions met, calling fetchAndUpdateGroupedLayout...'
      );
      // Pass the current orderedImages from the hook
      fetchAndUpdateGroupedLayout(orderedImages);

      // --- Update Refs --- >
      prevContainerWidthRef.current = currentWidth;
      prevZoomRef.current = currentZoom;
      prevOrderedImageIdsRef.current = currentImageIds;
      prevDebouncedIsGroupedRef.current = currentIsGrouped;
    } else {
      console.log('[ImageFeed Layout Effect] Conditions not met, skipping layout calculation.');
    }
  }, [
    containerWidth,
    zoom,
    orderedImages, // Effect depends on orderedImages
    debouncedIsGrouped,
    viewMode,
    fetchAndUpdateGroupedLayout, // fetch function ref is a dependency
    calculatedRows.length,
  ]);

  // Define handleImageClick (needs processedGroupedImages)
  const handleImageClick = useCallback(
    (clickedImage: ImageInfo) => {
      const groupIndex = processedGroupedImages.findIndex(group =>
        group.images.some(img => img.id === clickedImage.id)
      );
      if (groupIndex !== -1) {
        const group = processedGroupedImages[groupIndex];
        const imageIndexInGroup = group.images.findIndex(img => img.id === clickedImage.id);
        if (imageIndexInGroup !== -1) {
          setLightboxImages(group.images);
          setLightboxIndex(imageIndexInGroup);
        }
      }
    },
    [processedGroupedImages] // Dependency
  );

  // --- Effects --- >

  // --- Scroll Logic --- >
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(performance.now());

  const handleScroll = useCallback(() => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) return;

    const now = performance.now();
    const scrollTop = scrollElement.scrollTop;
    const timeDelta = now - lastScrollTimeRef.current;
    const scrollDelta = scrollTop - lastScrollTopRef.current;

    if (timeDelta > 10) {
      const velocity = Math.abs(scrollDelta) / timeDelta;
      velocityEMARef.current = EMA_ALPHA * velocity + (1 - EMA_ALPHA) * velocityEMARef.current;

      // Dynamic Overscan Calculation (existing)
      const calculatedOverscan =
        OVERSCAN_BASE +
        Math.min(velocityEMARef.current * OVERSCAN_FACTOR, OVERSCAN_MAX - OVERSCAN_BASE);
      setDynamicOverscan(Math.round(calculatedOverscan));

      // Add Prefetch Range Calculation
      if (!rowVirtualizer) {
        setPrefetchTargetRange(null);
      } else {
        const virtualItems = rowVirtualizer.getVirtualItems();
        const totalItemCount = calculatedRows.length;

        if (virtualItems.length > 0 && totalItemCount > 0) {
          const firstVisibleIndex = virtualItems[0].index;
          const lastVisibleIndex = virtualItems[virtualItems.length - 1].index;

          const prefetchCount = Math.min(
            Math.max(0, Math.round(velocityEMARef.current * PREFETCH_LOOKAHEAD_FACTOR)),
            MAX_PREFETCH_ITEMS
          );

          let startIndex = -1;
          let endIndex = -1;

          if (scrollDelta > 0 && prefetchCount > 0) {
            // Scrolling Down
            startIndex = lastVisibleIndex + 1;
            endIndex = startIndex + prefetchCount - 1;
          } else if (scrollDelta < 0 && prefetchCount > 0) {
            // Scrolling Up
            endIndex = firstVisibleIndex - 1;
            startIndex = endIndex - prefetchCount + 1;
          }

          // Clamp and validate the range
          startIndex = Math.max(0, startIndex);
          endIndex = Math.min(totalItemCount - 1, endIndex);

          if (startIndex <= endIndex) {
            setPrefetchTargetRange(prevRange => {
              if (!prevRange || prevRange[0] !== startIndex || prevRange[1] !== endIndex) {
                return [startIndex, endIndex];
              }
              return prevRange;
            });
          } else {
            setPrefetchTargetRange(prevRange => (prevRange === null ? null : null));
          }
        } else {
          setPrefetchTargetRange(prevRange => (prevRange === null ? null : null));
        }
      }

      lastScrollTopRef.current = scrollTop;
      lastScrollTimeRef.current = now;
      debouncedSaveScroll(folderPath, scrollTop);
    }
  }, [
    scrollContainerRef,
    folderPath,
    debouncedSaveScroll,
    rowVirtualizer,
    calculatedRows.length,
    setDynamicOverscan,
    setPrefetchTargetRange,
  ]);

  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      // Use lodashThrottle for the scroll handler
      const throttledScrollHandler = lodashThrottle(handleScroll, 100); // Throttle to ~10fps
      scrollElement.addEventListener('scroll', throttledScrollHandler);
      return () => scrollElement.removeEventListener('scroll', throttledScrollHandler);
    }
  }, [scrollContainerRef, handleScroll]);

  // --- Virtualization Measurement & Items --- >
  useLayoutEffect(() => {
    rowVirtualizer.measure?.();
  }, [
    zoom,
    containerWidth,
    calculatedRows.length,
    layoutMetrics.estimatedRowHeightFallback,
    layoutMetrics.gapSize,
    viewMode,
    debouncedIsGrouped,
    folderPath,
    rowVirtualizer,
  ]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Track animated rows
  useEffect(() => {
    const newlyVisibleIndices = new Set<number>();
    virtualItems.forEach(item => {
      if (!animatedRowIndices.has(item.index)) {
        newlyVisibleIndices.add(item.index);
      }
    });

    if (newlyVisibleIndices.size > 0) {
      setAnimatedRowIndices(prev => new Set([...prev, ...newlyVisibleIndices]));
    }
  }, [virtualItems, animatedRowIndices]);

  // --- End Virtualization Measurement ---

  // --- Add Scroll Restoration Effect ---
  useLayoutEffect(() => {
    const scrollElement = scrollContainerRef.current;
    // Try to restore scroll only after layout is stable
    if (isRestoringScrollRef.current && restoredState && rowHeightsRef.current.length > 0) {
      if (scrollElement) {
        console.log(`Restoring scroll to: ${restoredState.scrollTop}`);
        // Wrap scroll restoration in requestAnimationFrame for smoothness
        requestAnimationFrame(() => {
          scrollElement.scrollTop = restoredState.scrollTop;
          // Reset the flag *after* applying the scroll
          isRestoringScrollRef.current = false;
        });
      } else {
        isRestoringScrollRef.current = false; // Reset if element not found
      }
    }
  }, [restoredState, scrollContainerRef, virtualItems, folderPath]); // Depend on restored state, ref, virtual items, and folderPath
  // --- End Scroll Restoration Effect ---

  // --- Color Extraction Worker Integration --- >
  useEffect(() => {
    if (virtualItems.length === 0 || calculatedRows.length === 0 || images.length === 0) return;
    const visibleImageIds = new Set<string>();
    virtualItems.forEach(virtualItem => {
      const row = calculatedRows[virtualItem.index];
      row?.images.forEach(img => visibleImageIds.add(img.id));
    });

    // Track promises for colors requested in this pass
    const colorPromises: Promise<void>[] = [];

    visibleImageIds.forEach(id => {
      if (!imagePaletteMap.has(id) && !requestedColorIds.current.has(id)) {
        const imageInfo = images.find(img => img.id === id);
        if (imageInfo?.src) {
          const imageUrl = getImageUrl(imageInfo.src);
          requestedColorIds.current.add(id);

          const promise = workerPool
            .postRequest<ColorRequestPayload, ColorWorkerSuccessPayload>(
              'color',
              'extractColor',
              {
                id: imageInfo.id,
                src: imageUrl,
              },
              { priority: 1 } // Higher priority for visible items
            )
            .then(result => {
              // Check result and specifically if palette is a non-null object
              if (result && result.palette) {
                const newPalette: ImagePalette = result.palette;
                setImagePaletteMap(prevMap => {
                  const newMap = new Map(prevMap);
                  newMap.set(result.id, newPalette);
                  return newMap;
                });
              } else {
                // console.log(`[ImageFeed] Color extraction failed or null palette for ${result?.id}`);
              }
            })
            .catch(error => {
              console.error(`[ImageFeed] Color worker request failed for image ID ${id}:`, error);
            })
            .finally(() => {
              requestedColorIds.current.delete(id);
            });

          colorPromises.push(promise);
        }
      }
    });

    // After processing all visible items in this pass, update the context
    // Use Promise.allSettled to wait for all requests in this batch to finish
    // before updating context, preventing rapid flickering.
    if (colorPromises.length > 0) {
      Promise.allSettled(colorPromises).then(() => {
        // Find the palette for the *first* visible image that has one
        let firstVisiblePalette: ImagePalette | null = null;
        for (const virtualItem of virtualItems) {
          const row = calculatedRows[virtualItem.index];
          if (row) {
            for (const img of row.images) {
              const itemPalette = imagePaletteMap.get(img.id);
              if (itemPalette) {
                firstVisiblePalette = itemPalette;
                break; // Found a palette, use this one
              }
            }
          }
          if (firstVisiblePalette) break; // Stop searching rows if palette found
        }

        // Update context with the first visible palette, or null if none found
        if (firstVisiblePalette) {
          // console.log(
          //   '[ImageFeed] Updating ColorContext with palette (after batch):',
          //   firstVisiblePalette
          // ); // REMOVED
          setImagePalette(firstVisiblePalette);
        } else {
          // console.log(
          //   '[ImageFeed] No palette found for visible items after batch, setting context to null.'
          // ); // REMOVED
          setImagePalette(null);
        }
      });
    } else {
      // If no new colors were requested, still update context based on current visible items
      let firstVisiblePalette: ImagePalette | null = null;
      for (const virtualItem of virtualItems) {
        const row = calculatedRows[virtualItem.index];
        if (row) {
          for (const img of row.images) {
            const itemPalette = imagePaletteMap.get(img.id);
            if (itemPalette) {
              firstVisiblePalette = itemPalette;
              break;
            }
          }
        }
        if (firstVisiblePalette) break;
      }

      if (firstVisiblePalette) {
        // console.log(
        //   '[ImageFeed] Updating ColorContext with palette (no new requests):',
        //   firstVisiblePalette
        // ); // REMOVED
        setImagePalette(firstVisiblePalette);
      } else {
        // console.log(
        //   '[ImageFeed] No palette found for visible items (no new requests), setting context to null.'
        // ); // REMOVED
        setImagePalette(null);
      }
    }

    // Cleanup: No specific listener removal needed here.
    // Cancellation is handled by the main dependency change effect.
  }, [
    workerPool,
    virtualItems,
    calculatedRows,
    images,
    getImageUrl,
    imagePaletteMap,
    setImagePalette,
  ]);
  // --- End Color Extraction Worker Integration ---

  // <-- Instantiate animator on mount -->
  const groupingPipeline = useAnimationPipeline('grouping');
  useEffect(() => {
    // Pass the pipeline instance to the animator; it will be stored if needed,
    // but the animator primarily manages its own timeline now.
    groupingAnimatorRef.current = new GroupingAnimator(groupingPipeline);

    // <-- Cleanup animator on unmount -->
    return () => {
      groupingAnimatorRef.current?.clear();
    };
  }, [groupingPipeline]);

  // EFFECT TO TRIGGER ANIMATION BASED ON PROP CHANGE
  useEffect(() => {
    if (
      prevIsGrouped !== undefined &&
      prevIsGrouped !== isGrouped &&
      groupingAnimatorRef.current &&
      feedRef.current
    ) {
      const animator = groupingAnimatorRef.current;
      const cards = Array.from(feedRef.current.querySelectorAll('.card')) as HTMLElement[];
      const feedRect = feedRef.current.getBoundingClientRect();

      if (cards.length > 0) {
        // Calculate viewport-relative center for animations
        // This uses the feedRef, which is the container for the cards.
        const viewportFeedOriginX = feedRect.left + feedRect.width / 2;
        const viewportFeedOriginY = feedRect.top + 50; // Current Y offset, review if a different origin is better
        const viewportOrigin = { x: viewportFeedOriginX, y: viewportFeedOriginY };

        if (isGrouped) {
          console.log('[ImageFeed Prop Effect] Grouping triggered...');
          animator.group(cards, viewportOrigin); // Pass cards and origin
        } else {
          console.log('[ImageFeed Prop Effect] Ungrouping triggered...');
          animator.ungroup(cards, viewportOrigin); // Pass cards and origin
        }
      } else {
        console.warn('[ImageFeed Prop Effect] Cannot group/ungroup: No .card elements found.');
      }
    }
  }, [isGrouped, prevIsGrouped, groupingPipeline, feedCenter]); // Added feedCenter to deps as it's used for origin calc

  // --- Define getRowRects function --- >
  const getRowRects = useCallback(() => {
    return rowRectsMapRef.current;
  }, []); // No dependencies, just returns the current ref value

  // --- Render Logic --- >
  const renderContent = () => {
    const { gapSize } = layoutMetrics;
    if (!containerWidth) return null;

    // Determine loading state based on worker activity *after* initial data is available
    const showLoadingState = isGrouping || (viewMode === ViewMode.GRID && isLayoutCalculating);

    // --- Render Fake Card Pile during Loading --- >
    if (showLoadingState) {
      return (
        <div className={styles.fakeCardPileContainer}>
          {/* Simple representation of a card stack */}
          <div className={`${styles.fakeCard} ${styles.card3}`}></div>
          <div className={`${styles.fakeCard} ${styles.card2}`}></div>
          <div className={`${styles.fakeCard} ${styles.card1}`}></div>
        </div>
      );
    }

    // --- Render Dynamic Skeletons during Loading (REMOVED - This was a fallback for the old isLoadingImages state) --- >
    /*
    if (showLoadingState && viewMode === ViewMode.GRID) {
      // ... skeleton rendering based on dominantColorMap ...
    }
    */

    // Handle API errors after suspense resolves
    if (isError) {
      return (
        <div className={`${styles.container} ${styles.error}`}>
          Error loading images: {error?.message || 'Unknown error'}
        </div>
      );
    }

    // Handle case where data resolves but is empty
    const hasNoImages = !images || images.length === 0;
    if (hasNoImages) {
      return (
        <div className={styles.container}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.noImages}>
            No images found for this folder.
          </motion.div>
        </div>
      );
    }

    // Handle non-GRID view modes (pass raw images)
    if (viewMode !== ViewMode.GRID) {
      let ViewComponent;
      switch (viewMode) {
        case ViewMode.MASONRY:
          ViewComponent = LazyMasonryView;
          break;
        case ViewMode.BANNER:
          ViewComponent = LazyBannerView;
          break;
        case ViewMode.CAROUSEL:
          ViewComponent = LazyCarouselView;
          break;
        default:
          return null;
      }
      return (
        <ErrorBoundary fallback={<div>Failed to load view.</div>}>
          <Suspense fallback={<Spinner />}>
            {' '}
            {/* Suspense for lazy view component */}
            <ViewComponent images={images} zoom={zoom} />
          </Suspense>
        </ErrorBoundary>
      );
    }

    // --- Render Final Virtualized GRID View --- >
    if (viewMode === ViewMode.GRID && calculatedRows.length > 0) {
      return (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map(virtualItem => {
              const row = calculatedRows[virtualItem.index];
              if (!row) return null;

              // Determine if this row should play its entrance animation
              const shouldAnimate =
                calculatedRows[virtualItem.index] !== undefined &&
                !animatedRowIndices.has(virtualItem.index);

              return (
                <motion.div
                  key={virtualItem.key}
                  layout
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualItem.size,
                    y: virtualItem.start,
                  }}
                >
                  <ImageRow
                    images={row.images}
                    imageWidths={row.imageWidths ?? []}
                    onImageClick={handleImageClick}
                    columns={columns}
                    zoom={zoom}
                    isLastRow={virtualItem.index === calculatedRows.length - 1}
                    rowHeight={row.height}
                    initialAnimateState={shouldAnimate ? 'initial' : 'animate'}
                    feedCenter={feedCenter}
                    layoutDataMap={layoutDataMap}
                    groupedImages={processedGroupedImages}
                    workerPool={workerPool}
                    gap={gapSize}
                    containerWidth={containerWidth}
                    onImageLoadError={handleImageLoadError}
                    imagePaletteMap={imagePaletteMap}
                    onExitComplete={() => exitResolverRef.current && exitResolverRef.current()}
                    rowIndex={virtualItem.index}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    // Fallback if still loading but not caught above, or rows aren't ready for GRID
    // This might indicate worker calculations are still pending for grid view
    if (viewMode === ViewMode.GRID) {
      return <div className={styles.loadingFallback}>Calculating layout...</div>;
    }

    return null; // Should be covered by other view modes or error states
  };

  // Lightbox configuration
  const lightboxPlugins = useMemo(() => [Captions, Counter, Thumbnails, Zoom], []);

  // Prepare the lightbox slide objects
  const slides = useMemo(() => {
    if (!lightboxImages.length) return [];
    return lightboxImages.map(image => ({
      src: getImageUrl(image.src),
      alt: image.alt,
      title: image.title,
      width: image.width,
      height: image.height,
    }));
  }, [lightboxImages, getImageUrl]);

  // Save original order for reference (if needed later)
  useEffect(() => {
    // If customImageOrder is being initialized, store the original order
    if (!customImageOrder && images.length > 0) {
      // We now store by folder path so no need for a separate storage
      console.log('[ImageFeed] Original image order available if needed for reset');
    }
  }, [customImageOrder, images]);

  // --- Main Component Return Structure --- >
  // Error and No Images handled inside renderContent now, after suspense resolves
  return (
    <div
      ref={feedRef}
      className={styles.container}
      style={{
        position: 'relative',
      }}
    >
      <div className={styles.feed}>
        <DragProvider
          initialImages={images}
          currentOrder={customImageOrder}
          onOrderChange={setCustomImageOrder}
          getRowRects={getRowRects}
          rows={calculatedRows.map((row, index) => ({ id: index, images: row.images }))}
        >
          {customImageOrder && (
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={resetImageOrder}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded shadow-lg transition-colors"
                title="Reset to original image order"
              >
                Reset Order
              </button>
            </div>
          )}
          {renderContent()}
        </DragProvider>
      </div>

      <Lightbox
        open={lightboxIndex !== -1}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={lightboxPlugins}
      />
    </div>
  );
};

export default React.memo(ImageFeed);
