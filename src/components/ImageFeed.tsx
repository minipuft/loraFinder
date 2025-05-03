import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
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
import { GroupingAnimator } from '../animations/GroupingAnimator';
import { ColorContext } from '../contexts/ColorContext';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
import { useFolderImages } from '../hooks/query/useFolderImages';
import { usePrefetchManager } from '../hooks/usePrefetchManager.js';
import usePrevious from '../hooks/usePrevious';
import useWindowSize from '../hooks/useWindowSize.js';
import { loadScrollState, saveScrollState, ScrollState } from '../lib/cache/feedStateCache';
import styles from '../styles/ImageFeed.module.scss';
import { ImageInfo, ViewMode } from '../types/index.js';
import AnimationUtils from '../utils/AnimationUtils';
import {
  calculateGapSize,
  calculateLayout,
  LayoutConfig,
  MIN_IMAGE_WIDTH,
  RowConfig,
} from '../utils/layoutCalculator';
import WorkerPool, { WorkerType } from '../workers/workerPool';
import AuraBackground from './AuraBackground';
import ErrorBoundary from './ErrorBoundary';
import { ImageHoverData } from './ImageItem';
import ImageRow from './ImageRow';
import { LazyBannerView, LazyCarouselView, LazyMasonryView } from './lazy/lazyWidgets';
import Spinner from './lazy/Spinner';

// Simple throttle function
function throttle<F extends (...args: any[]) => any>(func: F, limit: number) {
  let inThrottle: boolean;
  let lastResult: ReturnType<F>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const throttled = function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    const context = this;
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
      // Call the function but don't worry about returning its result for listener
      func.apply(context, args);
    }
    // Explicitly return void for listener compatibility
    // return lastResult; // Removed potentially problematic return
  };

  return throttled;
}

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

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  folderPath: string;
  isGrouped: boolean;
  zoom: number;
  viewMode: ViewMode;
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
  color: string | null;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({
  folderPath,
  isGrouped,
  zoom,
  viewMode,
  scrollContainerRef,
}) => {
  // --- EARLY EXIT if folderPath is invalid --- >
  if (!folderPath || typeof folderPath !== 'string' || folderPath.trim() === '') {
    console.warn('[ImageFeed] Render skipped: Invalid folderPath received.');
    // Optionally render a placeholder or null, or a specific message
    // Render null for now, parent component should handle loading state
    return null;
  }

  console.log('[ImageFeed] Render - isGrouped prop:', isGrouped);
  const {
    data: originalImages,
    //isLoading: isLoadingImages, // No longer returned by useSuspenseQuery
    isError,
    error,
  } = useFolderImages(folderPath);

  const windowSize = useWindowSize();
  const feedRef = useRef<HTMLDivElement>(null);
  const groupingAnimatorRef = useRef<GroupingAnimator | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(4);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);
  const animationUtils = useMemo(() => AnimationUtils.getInstance(), []);
  const { setDominantColors, setHoverState } = useContext(ColorContext);
  const [dominantColorMap, setDominantColorMap] = useState<Map<string, string>>(new Map());
  const requestedColorIds = useRef<Set<string>>(new Set());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [restoredState, setRestoredState] = useState<ScrollState | null>(null);
  const previousFolderPathRef = useRef<string | null>(null);
  const rowHeightsRef = useRef<number[]>([]);
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
  const previousIsGrouped = usePrevious(isGrouped);
  const exitResolverRef = useRef<(() => void) | null>(null);
  const [prefetchTargetRange, setPrefetchTargetRange] = useState<[number, number] | null>(null);

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
    return originalImages.filter(img => img && !failedImageIds.has(img.id)); // Added check for img existence
  }, [originalImages, failedImageIds]);

  const handleImageLoadError = useCallback((imageId: string) => {
    setFailedImageIds(prev => {
      if (prev.has(imageId)) return prev;
      console.log(`ImageFeed: Registering error for image ${imageId}`);
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  // --- Worker Pool --- >
  const workerPool = useMemo(() => WorkerPool.getInstance(), []);

  // --- State for Worker Operations --- >
  const [calculatedRows, setCalculatedRows] = useState<RowConfig[]>([]);
  const [isLayoutCalculating, setIsLayoutCalculating] = useState(false);
  const [processedGroupedImages, setProcessedGroupedImages] = useState<ImageGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  // Flag to track if an async operation is currently active for a worker type
  const activeRequestRef = useRef<{ [key in WorkerType]?: boolean }>({});

  // --- Layout Data Map --- >
  const layoutDataMap = useMemo(() => {
    const map = new Map<string, { top: number; left: number; width: number; height: number }>();
    let currentTop = 0;
    const gap = calculateGapSize(zoom);
    // Ensure calculatedRows exists and has items before iterating
    if (calculatedRows && calculatedRows.length > 0) {
      calculatedRows.forEach(row => {
        let currentLeft = 0;
        row.images.forEach((img, index) => {
          if (!row.imageWidths || row.imageWidths.length <= index) {
            console.warn(`[ImageFeed] Missing imageWidths for image ${img.id} in row.`);
            return; // Skip this image if width data is missing
          }
          const width = row.imageWidths[index];
          map.set(img.id, {
            top: currentTop, // Store viewport-relative top
            left: currentLeft, // Store viewport-relative left
            width: width,
            height: row.height,
          });
          currentLeft += width + gap;
        });
        currentTop += row.height + gap;
      });
    }
    return map;
  }, [calculatedRows, zoom]); // Keep dependencies simple: recalculate if rows or zoom change

  // --- Feed Center Calculation ---
  // Calculate the center of the feed area based on its client rect.
  // Ensure it always returns a valid object, defaulting to {0, 0}
  const feedCenter = useMemo(() => {
    if (feedRef.current) {
      const rect = feedRef.current.getBoundingClientRect();
      // Use viewport-relative coordinates for GSAP calculations
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: 0, y: 0 }; // Default when ref is not available
    // Depend on containerWidth which changes when the ref is measured,
    // and windowSize for viewport changes.
  }, [containerWidth, windowSize]);

  // --- Initialize (Refactored) Prefetch Manager ---
  usePrefetchManager({
    imageList: images, // Pass the current list of images
    prefetchTargetRange: prefetchTargetRange, // Pass the calculated range state
    // concurrency: 5, // Optional: Adjust concurrency if needed
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
      // Include estimated height as it affects the worker call
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
    setDominantColorMap(new Map());
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
          !dominantColorMap.has(imageInfo.id) &&
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
              if (result?.color) {
                // Check if color exists and is non-null/empty string
                setDominantColorMap(prevMap =>
                  new Map(prevMap).set(result.id, result.color as string)
                );
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

  // ---> Define Worker Fetch Logic OUTSIDE Effects for reusability <----
  const fetchAndUpdateGroupedLayout = useCallback(async () => {
    // Keep this check here: only run if necessary
    if (!images || images.length === 0 || containerWidth <= 0) {
      console.log('[ImageFeed] Skipping data fetch (no images or zero width).');
      setProcessedGroupedImages([]);
      setCalculatedRows([]);
      setIsGrouping(false);
      setIsLayoutCalculating(false);
      return;
    }

    setIsGrouping(true); // Indicate start of data fetching
    if (viewMode === ViewMode.GRID) setIsLayoutCalculating(true);
    activeRequestRef.current = {};
    workerPool.cancelAllPendingTasks(); // Cancel previous attempts

    try {
      console.log('[ImageFeed] Fetching grouped/layout data...');
      // 1. Grouping Worker
      const groupingResult = await workerPool.postRequest<
        GroupingRequestPayload,
        { groupedImages: ImageGroup[] }
      >('grouping', 'groupImages', { images, isGrouped: debouncedIsGrouped }, { priority: 9 }); // Use debounced value
      // ----> State Update 1: Grouped Images
      setProcessedGroupedImages(groupingResult.groupedImages);
      setIsGrouping(false); // Grouping data fetch complete

      // 2. Layout Worker (if needed)
      if (viewMode === ViewMode.GRID) {
        const firstImages = groupingResult.groupedImages
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
          // ----> State Update 2: Calculated Rows
          setCalculatedRows(layoutResult);
        } else {
          setCalculatedRows([]);
        }
        setIsLayoutCalculating(false); // Layout data fetch complete
      } else {
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
    // Note: activeRequestRef might need more granular handling if errors occur mid-pipeline
  }, [
    images,
    debouncedIsGrouped, // Use debounced value
    containerWidth,
    zoom,
    viewMode,
    layoutMetrics.estimatedRowHeightFallback,
    workerPool,
    // Include setters to satisfy exhaustive-deps, though they are stable
    setProcessedGroupedImages,
    setCalculatedRows,
    setIsGrouping,
    setIsLayoutCalculating,
  ]);

  // ---> UNIFIED Effect for Transitions AND Data Fetching <---
  useEffect(() => {
    const handleLayoutOrGroupChange = async () => {
      const isTransition = isGrouped !== previousIsGrouped;
      console.log(
        `[ImageFeed] Layout/Group Effect: isGrouped=${isGrouped}, previous=${previousIsGrouped}, isTransition=${isTransition}`
      );

      let animationRan = false;
      let exitPromise: Promise<void> | null = null;

      // Grouping transition (GSAP)
      if (
        isTransition &&
        isGrouped &&
        viewMode === ViewMode.GRID &&
        groupingAnimatorRef.current &&
        feedRef.current
      ) {
        const cards = Array.from(
          feedRef.current.querySelectorAll(`.${styles.imageWrapper}.card`)
        ) as HTMLElement[];
        console.log(`[ImageFeed] Grouping Transition: Found ${cards.length} cards.`);
        if (cards.length > 0) {
          try {
            console.log('[ImageFeed] Awaiting group animation...');
            await groupingAnimatorRef.current.group(cards, feedCenter);
            console.log('[ImageFeed] Group animation complete.');
            animationRan = true;
          } catch (animError) {
            console.error('[ImageFeed] Group animation failed:', animError);
          }
        } else {
          console.log('[ImageFeed] Skipping group animation: no cards found.');
        }
      }
      // Ungrouping transition: create exit promise for Framer Motion
      else if (isTransition && !isGrouped) {
        console.log('[ImageFeed] Ungroup transition detected. Waiting for exit animation...');
        exitPromise = new Promise<void>(resolve => {
          exitResolverRef.current = resolve;
        });
      } else if (isTransition) {
        console.log(
          '[ImageFeed] Transition detected, but skipping GSAP animation (not grid view or refs missing).'
        );
      }

      // Await exit if ungrouped
      if (exitPromise) {
        console.log('[ImageFeed] Awaiting exit complete from ImageRow...');
        await exitPromise;
        console.log('[ImageFeed] Exit animation complete.');
        exitResolverRef.current = null;
      }

      // Always fetch and update layout data after animation or immediately
      console.log('[ImageFeed] Proceeding to fetch/update layout data...');
      await fetchAndUpdateGroupedLayout();
      console.log('[ImageFeed] Data fetch/update complete.');
    };

    handleLayoutOrGroupChange();

    // Dependencies: Include previousIsGrouped to ensure comparison is accurate on change.
  }, [layoutInputs, fetchAndUpdateGroupedLayout, previousIsGrouped, feedCenter, viewMode]); // Key dependencies

  // Define the useEffect that updates rowHeightsRef HERE, AFTER calculatedRows state
  useEffect(() => {
    if (viewMode === ViewMode.GRID && calculatedRows && calculatedRows.length > 0) {
      rowHeightsRef.current = calculatedRows.map(row => row.height);
    } else {
      rowHeightsRef.current = [];
    }
  }, [calculatedRows, viewMode, folderPath]);

  // Handle image overflow (wrapped in useCallback)
  const handleImageOverflow = useCallback((image: ImageInfo) => {
    console.warn('Image overflow detected:', image.id);
  }, []);

  // Update handleImageClick to work with grouped images and set lightbox plugins (wrapped in useCallback)
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
    [processedGroupedImages]
  );

  // --- Virtualization Setup ---
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

  // --- End Virtualization Setup ---

  // --- Scroll Velocity and Dynamic Overscan / Prefetch ---
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(performance.now());

  // ---> MOVE handleScroll definition AFTER rowVirtualizer definition
  const handleScroll = useCallback(() => {
    const scrollElement = scrollContainerRef.current;
    // Check for rowVirtualizer *inside* the handler where it's used
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
      // Check rowVirtualizer here - now it should be defined in this scope
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
    rowVirtualizer, // rowVirtualizer is now defined before this callback
    calculatedRows.length,
    setDynamicOverscan,
    setPrefetchTargetRange,
  ]);
  // <--- End handleScroll definition move

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      // Use throttle for the scroll handler to limit frequency
      const throttledScrollHandler = throttle(handleScroll, 100); // Throttle to ~10fps
      scrollElement.addEventListener('scroll', throttledScrollHandler);
      return () => scrollElement.removeEventListener('scroll', throttledScrollHandler);
    }
    // ---> Make sure handleScroll dependency is correctly handled
  }, [scrollContainerRef, handleScroll]);
  // --- End Scroll Velocity Logic Section (now contains handleScroll) ---

  // --- Virtualization Measurement & Items (Moved up) ---
  // Remeasure rows whenever zoom, containerWidth, row count, row height fallback, gap size, view mode, or grouping changes
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

  // Get the virtual items to render
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

  // Callback function for image hover - with delay logic
  const handleImageHover = useCallback(
    (data: ImageHoverData) => {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (data.isHovering) {
        // Set a timeout to activate hover state after a delay
        hoverTimeoutRef.current = setTimeout(() => {
          // Get color from the state map if available
          const color = dominantColorMap.get(data.imageId) || null;
          setHoverState({ isHovering: true, position: data.position, color: color });
        }, 150); // 150ms delay
      } else {
        // If mouse leaves, immediately deactivate hover state
        setHoverState({ isHovering: false, position: null, color: null });
      }
    },
    [setHoverState, dominantColorMap] // Dependency remains setHoverState
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    // Clear timeout if component unmounts
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // --- Color Extraction Worker Integration (Add Priority for visible items) --- >
  useEffect(() => {
    // Only run if we have virtual items and rows calculated
    if (virtualItems.length === 0 || calculatedRows.length === 0 || images.length === 0) {
      return;
    }

    const visibleImageIds = new Set<string>();
    virtualItems.forEach(virtualItem => {
      const row = calculatedRows[virtualItem.index];
      row?.images.forEach(img => visibleImageIds.add(img.id));
    });

    // Track promises for colors requested in this pass
    const colorPromises: Promise<void>[] = [];

    visibleImageIds.forEach(id => {
      if (!dominantColorMap.has(id) && !requestedColorIds.current.has(id)) {
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
              // Check result and specifically if color is a non-null string
              if (result && typeof result.color === 'string') {
                // Assign to a new variable to help TS with type narrowing inside the setter
                const colorValue: string = result.color;
                setDominantColorMap(prevMap => {
                  const newMap = new Map(prevMap);
                  // Use the explicitly typed colorValue
                  newMap.set(result.id, colorValue);
                  return newMap;
                });
              } else {
                // console.log(`[ImageFeed] Color extraction failed or null for ${result?.id}`);
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
        // Re-calculate visible colors *after* potential map updates
        const currentVisibleColors: string[] = [];
        virtualItems.forEach(virtualItem => {
          const row = calculatedRows[virtualItem.index];
          row?.images.forEach(img => {
            // Read from the potentially updated dominantColorMap state
            const itemColor = dominantColorMap.get(img.id);
            if (itemColor) {
              currentVisibleColors.push(itemColor);
            }
          });
        });
        // Update context with the first 1 or 2 valid visible colors
        if (currentVisibleColors.length > 0) {
          // console.log('[ImageFeed] Updating context dominantColors after batch:', currentVisibleColors.slice(0, 2));
          setDominantColors(currentVisibleColors.slice(0, 2));
        } else {
          // console.log('[ImageFeed] No dominant colors found after batch, resetting context.');
          setDominantColors([]); // Reset if no colors found
        }
      });
    } else {
      // If no new colors were requested, still update context based on current visible colors
      // This handles scrolling without new requests
      const currentVisibleColors: string[] = [];
      virtualItems.forEach(virtualItem => {
        const row = calculatedRows[virtualItem.index];
        row?.images.forEach(img => {
          const itemColor = dominantColorMap.get(img.id);
          if (itemColor) {
            currentVisibleColors.push(itemColor);
          }
        });
      });
      if (currentVisibleColors.length > 0) {
        // console.log('[ImageFeed] Updating context dominantColors (no new requests):', currentVisibleColors.slice(0, 2));
        setDominantColors(currentVisibleColors.slice(0, 2));
      } else {
        // console.log('[ImageFeed] No dominant colors found (no new requests), resetting context.');
        setDominantColors([]); // Reset if no colors found
      }
    }

    // Cleanup: No specific listener removal needed here.
    // Cancellation is handled by the main dependency change effect.
  }, [
    workerPool,
    virtualItems, // Re-run when visible items change
    calculatedRows, // Re-run if row layout changes
    images, // Re-run if images change
    getImageUrl,
    dominantColorMap, // Re-run if the map updates (to potentially update context)
    setDominantColors, // Context setter
  ]);
  // --- End Color Extraction Worker Integration ---

  // <-- Instantiate animator on mount -->
  useEffect(() => {
    groupingAnimatorRef.current = new GroupingAnimator();

    // <-- Cleanup animator on unmount -->
    return () => {
      groupingAnimatorRef.current?.kill();
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

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
    // Only render if *not* in worker loading state and rows are calculated for GRID view
    if (viewMode === ViewMode.GRID && calculatedRows.length > 0) {
      return (
        <div // Outer container: Sets the total scrollable height
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div // Inner container: Absolutely positioned items are placed here
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
                <motion.div // Wrapper with animation
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
                    // Pass necessary props down
                    images={row.images}
                    imageWidths={row.imageWidths ?? []}
                    onImageClick={handleImageClick}
                    columns={columns}
                    zoom={zoom}
                    isLastRow={virtualItem.index === calculatedRows.length - 1}
                    rowHeight={row.height}
                    initialAnimateState={shouldAnimate ? 'initial' : 'animate'} // Pass state
                    feedCenter={feedCenter} // Pass center coords
                    layoutDataMap={layoutDataMap} // <-- Pass layoutDataMap down
                    groupedImages={processedGroupedImages}
                    workerPool={workerPool}
                    gap={gapSize}
                    containerWidth={containerWidth}
                    onImageHover={handleImageHover}
                    onImageLoadError={handleImageLoadError}
                    // Pass the color map down to ImageRow/ImageItem if needed
                    dominantColorMap={dominantColorMap}
                    onExitComplete={() => exitResolverRef.current && exitResolverRef.current()}
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
      <AuraBackground />
      <div className={styles.feed}>{renderContent()}</div>

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
