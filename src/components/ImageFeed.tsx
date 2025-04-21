import { motion, useTransform, useViewportScroll } from 'framer-motion';
import React, {
  CSSProperties,
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
import styles from '../styles/ImageFeed.module.scss';
import { ImageInfo, ViewMode } from '../types/index.js';
import { truncateImageTitle } from '../utils/stringUtils.js';
import { ImageHoverData } from './ImageItem.js';
import ImageRow from './ImageRow.js';
import ImageSkeleton from './ImageSkeleton.js';
// import Lottie from 'react-lottie';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FastAverageColor } from 'fast-average-color';
import { default as lodashDebounce } from 'lodash/debounce';
import { ColorContext } from '../contexts/ColorContext';
import { useFolderImages } from '../hooks/query/useFolderImages';
import useWindowSize from '../hooks/useWindowSize.js';
import { loadScrollState, saveScrollState, ScrollState } from '../lib/cache/feedStateCache';
import AnimationSystem from '../utils/AnimationSystem';
import {
  calculateGapSize,
  calculateLayout,
  distributeImages,
  LayoutConfig,
  MIN_IMAGE_WIDTH,
} from '../utils/layoutCalculator';
import WorkerPool from '../workers/workerPool';
import AuraBackground from './AuraBackground';
import { BannerView, CarouselView, MasonryView } from './views';

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

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({
  folderPath,
  isGrouped,
  zoom,
  viewMode,
  scrollContainerRef,
}) => {
  const {
    data: originalImages,
    isLoading,
    isError,
    error,
    isPlaceholderData,
  } = useFolderImages(folderPath);

  const windowSize = useWindowSize();
  const feedRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(4);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);
  const [rowTransforms, setRowTransforms] = useState<number[]>([]);
  const { scrollY } = useViewportScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 200]);
  const y2 = useTransform(scrollY, [0, 300], [0, -200]);
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);
  const { setDominantColors, setHoverState } = useContext(ColorContext);
  const facRef = useRef<FastAverageColor | null>(null);
  const lastProcessedRowIndexRef = useRef<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [restoredState, setRestoredState] = useState<ScrollState | null>(null);
  const previousFolderPathRef = useRef<string | null>(null);
  const rowHeightsRef = useRef<number[]>([]);
  const isRestoringScrollRef = useRef(false);
  const velocityEMARef = useRef(0); // For smoothing velocity readings
  const OVERSCAN_BASE = 3; // Slightly reduced base
  const OVERSCAN_MAX = 15; // Slightly reduced max
  const EMA_ALPHA = 0.2; // More smoothing (lower alpha = more smoothing)
  const OVERSCAN_FACTOR = 10; // Adjust mapping sensitivity
  const workerPool = useMemo(() => WorkerPool.getInstance(), []);

  // --- Add missing useState declaration --- >
  const [dynamicOverscan, setDynamicOverscan] = useState(OVERSCAN_BASE);
  // --- End missing useState declaration --- >

  // State to track failed image IDs
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  // --- Debouncing Logic for isGrouped ---
  const [debouncedIsGrouped, setDebouncedIsGrouped] = useState(isGrouped);

  // Use the renamed lodashDebounce here
  const updateDebouncedGrouped = useCallback(
    lodashDebounce((newValue: boolean) => {
      setDebouncedIsGrouped(newValue);
      console.log('[ImageFeed] Applying debounced isGrouped:', newValue);
    }, 300),
    []
  );

  // Effect to call the debounced function when the raw prop changes
  useEffect(() => {
    updateDebouncedGrouped(isGrouped);

    // Cleanup function to cancel any pending debounced call
    return () => {
      updateDebouncedGrouped.cancel();
    };
  }, [isGrouped, updateDebouncedGrouped]);
  // --- End Debouncing Logic ---

  // Callback to report image load errors
  const handleImageLoadError = useCallback((imageId: string) => {
    setFailedImageIds(prev => {
      if (prev.has(imageId)) return prev; // Avoid unnecessary state updates
      console.log(`ImageFeed: Registering error for image ${imageId}`);
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  // --- Scroll Persistence Logic ---

  // Debounced function to save scroll state during active scroll
  const debouncedSaveScroll = useCallback(
    debounce((path: string, scroll: number /*, heights: number[], width: number */) => {
      if (path && !isRestoringScrollRef.current) {
        // Only save scroll position
        saveScrollState(path, scroll);
        // saveFeedState(path, {
        //   scrollTop: scroll,
        //   rowHeights: heights, // REMOVED
        //   containerWidth: width, // REMOVED
        // });
      }
    }, 500),
    []
  );

  // Load state on mount/folder change & Save state on unmount/folder change
  useEffect(() => {
    let isMounted = true;

    const loadAndSetState = async () => {
      // Use loadScrollState
      const loadedState = await loadScrollState(folderPath);
      if (isMounted) {
        // --- Remove width validation ---
        // const widthDifference =
        //   containerWidth > 0 && loadedState
        //     ? Math.abs(loadedState.containerWidth - containerWidth)
        //     : Infinity;
        // const isValidWidth = widthDifference < 50;

        // If state exists, restore it
        if (loadedState /* && isValidWidth */) {
          setRestoredState(loadedState);
          isRestoringScrollRef.current = true;
        } else {
          // --- Remove width mismatch logging ---
          // if (!isValidWidth && loadedState) {
          //   console.warn(
          //     `Invalidating cached state for ${folderPath} due to width mismatch. Cached: ${loadedState.containerWidth}, Current: ${containerWidth}`
          //   );
          // }
          setRestoredState(null);
          // Set scroll to top only if no state is being restored
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
          isRestoringScrollRef.current = false;
        }
      }
    };

    // Load state immediately, don't wait for containerWidth
    // if (containerWidth > 0) {
    loadAndSetState();
    // }

    const currentPathForCleanup = folderPath;
    previousFolderPathRef.current = currentPathForCleanup;

    return () => {
      isMounted = false;
      const scrollElement = scrollContainerRef.current;
      const folderToSave = previousFolderPathRef.current;

      // Only save if layout seems ready (rowHeightsRef has items)
      if (scrollElement && folderToSave && rowHeightsRef.current.length > 0) {
        // --- Only save scrollTop --- >
        // const currentState: Omit<FeedState, 'timestamp'> = {
        //   scrollTop: scrollElement.scrollTop,
        //   rowHeights: rowHeightsRef.current,
        //   containerWidth: containerWidth,
        // };
        // saveFeedState(folderToSave, currentState);
        saveScrollState(folderToSave, scrollElement.scrollTop);
      }

      debouncedSaveScroll.cancel?.();
      // --- ADD CANCELLATION ON UNMOUNT --- >
      console.log('ImageFeed: Unmounting, cancelling pending tasks.');
      workerPool.cancelPendingTasks();
    };
    // Remove containerWidth from dependencies, load immediately
  }, [folderPath, scrollContainerRef, debouncedSaveScroll, workerPool]);

  // --- End Scroll Persistence Logic ---

  // Calculate average aspect ratio for fallback estimation
  const avgAspectRatio = useMemo(() => {
    if (!originalImages || originalImages.length === 0) return 1; // Default aspect ratio

    const validImages = originalImages.filter(img => img && img.width > 0 && img.height > 0);
    if (validImages.length === 0) return 1;

    const totalRatio = validImages.reduce((sum, img) => sum + img.width / img.height, 0);
    return totalRatio / validImages.length;
  }, [originalImages]);

  // Calculate layout metrics (using helper function for clarity if needed)
  const layoutMetrics = useMemo(() => {
    const gapSize = calculateGapSize(zoom);
    let estimatedRowHeightFallback = 200; // Default
    // Potentially more complex calculation as in pasted version if needed
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

  // Reset states when folder or view mode changes
  useEffect(() => {
    setLightboxIndex(-1);
    setLightboxImages([]);
    lastProcessedRowIndexRef.current = null;
    setDominantColors([]);
    setFailedImageIds(new Set());
    console.log(
      `ImageFeed: ${folderPath ? 'Folder' : 'ViewMode/Group'} changed, cancelling pending tasks.`
    );
    workerPool.cancelPendingTasks();
  }, [folderPath, viewMode, isGrouped, setDominantColors, workerPool]);

  // --- ADD CANCELLATION ON ZOOM CHANGE --- >
  useEffect(() => {
    console.log('ImageFeed: Zoom changed, cancelling pending tasks.');
    workerPool.cancelPendingTasks();
  }, [zoom, workerPool]);

  // Initialize FAC instance on mount
  useEffect(() => {
    facRef.current = new FastAverageColor();
    return () => {
      facRef.current?.destroy?.();
    };
  }, []);

  // --- Container Width Management ---

  // Shared function to update width and columns
  const updateContainerWidth = useCallback(() => {
    if (!feedRef.current) return;

    const rect = feedRef.current.getBoundingClientRect();
    const newWidth = Math.max(MIN_IMAGE_WIDTH, rect.width);

    // Check if width actually changed before updating state
    setContainerWidth(prevWidth => {
      if (newWidth !== prevWidth) {
        // Recalculate layout columns based on the new width
        const config: LayoutConfig = {
          containerWidth: newWidth,
          zoom,
          viewMode,
          isGrouped: debouncedIsGrouped,
        };
        const layout = calculateLayout(config);
        // Update columns directly here if needed, or rely on layoutMetrics memo
        setColumns(layout.columns);
        return newWidth;
      }
      return prevWidth; // Return previous width if no change
    });
  }, [zoom, viewMode, debouncedIsGrouped, updateDebouncedGrouped]); // Dependencies are things used *inside* the function

  // Use useLayoutEffect for the *initial* measurement before paint
  useLayoutEffect(() => {
    updateContainerWidth();
  }, [updateContainerWidth]); // Re-run if the function identity changes (due to its deps)

  // Use useEffect for setting up listeners for *subsequent* updates
  useEffect(() => {
    // Add resize observer for more accurate width updates
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (feedRef.current) {
      resizeObserver.observe(feedRef.current);
    }

    // Use standard resize listener as a fallback or additional trigger
    window.addEventListener('resize', updateContainerWidth);

    // Cleanup listeners on unmount
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerWidth);
    };
    // This effect only needs to run once to set up listeners
    // updateContainerWidth is stable due to useCallback
  }, [updateContainerWidth]);

  // --- End Container Width Management ---

  // Filter out images that failed to load *before* grouping/layout
  const images = useMemo(() => {
    if (!originalImages) return [];
    return originalImages.filter(img => !failedImageIds.has(img.id));
  }, [originalImages, failedImageIds]);

  // Modified groupedImages calculation (uses filtered images)
  const groupedImages = useMemo(() => {
    console.time('groupedImages calculation'); // Start perf timer
    if (!Array.isArray(images) || images.length === 0) {
      console.timeEnd('groupedImages calculation');
      return [];
    }

    const validImages = images.filter(
      image =>
        image &&
        typeof image === 'object' &&
        'width' in image &&
        'height' in image &&
        image.width > 0 &&
        image.height > 0
    );

    if (!debouncedIsGrouped) {
      const result = validImages.map(image => ({
        key: image.id,
        images: [image],
        isCarousel: false,
      }));
      console.timeEnd('groupedImages calculation');
      return result;
    }

    // --- Optimized Grouping Logic ---
    // 1. Pre-compute processed titles
    console.time('groupedImages - precompute titles');
    const processedTitles = new Map<string, string>();
    validImages.forEach(image => {
      // Store by image.id -> processedTitle
      processedTitles.set(image.id, truncateImageTitle(image.alt));
    });
    console.timeEnd('groupedImages - precompute titles');

    // 2. Group using pre-computed titles
    console.time('groupedImages - grouping loop');
    const groups: { [key: string]: ImageInfo[] } = {};
    validImages.forEach(image => {
      const processedTitle = processedTitles.get(image.id) || 'Untitled'; // Get pre-computed title
      if (!groups[processedTitle]) {
        groups[processedTitle] = [];
      }
      groups[processedTitle].push(image);
    });
    console.timeEnd('groupedImages - grouping loop');

    // 3. Convert groups object to array
    console.time('groupedImages - convert to array');
    const result = Object.entries(groups).map(([key, group]) => ({
      key,
      images: group,
      isCarousel: group.length > 1,
    }));
    console.timeEnd('groupedImages - convert to array');
    // --- End Optimized Grouping Logic ---

    console.timeEnd('groupedImages calculation'); // End overall perf timer
    return result;
  }, [images, debouncedIsGrouped]); // Dependencies remain the same

  // Enhanced groupedRows calculation (uses filtered images via groupedImages)
  const groupedRows = useMemo(() => {
    if (!containerWidth || groupedImages.length === 0 || viewMode !== ViewMode.GRID) return [];

    const firstImages = groupedImages
      .map(group => group.images[0])
      .filter(image => image && image.width > 0 && image.height > 0);

    if (firstImages.length === 0) return [];

    return distributeImages(
      firstImages,
      containerWidth,
      zoom,
      layoutMetrics.estimatedRowHeightFallback
    );
  }, [groupedImages, zoom, containerWidth, viewMode, layoutMetrics.estimatedRowHeightFallback]); // Depends on groupedImages

  // Define the useEffect that updates rowHeightsRef HERE, AFTER groupedRows
  useEffect(() => {
    if (viewMode === ViewMode.GRID && groupedRows && groupedRows.length > 0) {
      rowHeightsRef.current = groupedRows.map(row => row.height);
    } else {
      rowHeightsRef.current = [];
    }
  }, [groupedRows, viewMode, folderPath]);

  // Handle image overflow (wrapped in useCallback)
  const handleImageOverflow = useCallback((image: ImageInfo) => {
    console.warn('Image overflow detected:', image.id);
    // Implement any necessary overflow handling logic here
  }, []); // No dependencies needed if it only uses console

  // Update handleImageClick to work with grouped images and set lightbox plugins (wrapped in useCallback)
  const handleImageClick = useCallback(
    (clickedImage: ImageInfo) => {
      // Find the group the clicked image belongs to
      const groupIndex = groupedImages.findIndex(group =>
        group.images.some(img => img.id === clickedImage.id)
      );

      if (groupIndex !== -1) {
        const group = groupedImages[groupIndex];
        // Find the index of the clicked image WITHIN that group
        const imageIndexInGroup = group.images.findIndex(img => img.id === clickedImage.id);

        if (imageIndexInGroup !== -1) {
          setLightboxImages(group.images); // Set the images for the lightbox
          setLightboxIndex(imageIndexInGroup); // Set the index WITHIN the group
        }
      }
    },
    [groupedImages, setLightboxImages, setLightboxIndex] // Add state setters to dependencies
  );

  // --- Scroll Velocity and Dynamic Overscan --- >
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
      // Avoid division by zero or tiny intervals
      const velocity = Math.abs(scrollDelta) / timeDelta; // Pixels per millisecond
      // Update EMA velocity
      velocityEMARef.current = EMA_ALPHA * velocity + (1 - EMA_ALPHA) * velocityEMARef.current;

      // Calculate dynamic overscan based on smoothed velocity
      const calculatedOverscan =
        OVERSCAN_BASE +
        Math.min(velocityEMARef.current * OVERSCAN_FACTOR, OVERSCAN_MAX - OVERSCAN_BASE);
      setDynamicOverscan(Math.round(calculatedOverscan));

      // Update refs for next calculation
      lastScrollTopRef.current = scrollTop;
      lastScrollTimeRef.current = now;

      // Trigger debounced save (if still needed)
      debouncedSaveScroll(folderPath, scrollTop);
    }
  }, [scrollContainerRef, folderPath, debouncedSaveScroll]);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      // Use throttle for the scroll handler to limit frequency
      const throttledScrollHandler = throttle(handleScroll, 100); // Throttle to ~10fps
      scrollElement.addEventListener('scroll', throttledScrollHandler);
      return () => scrollElement.removeEventListener('scroll', throttledScrollHandler);
    }
  }, [scrollContainerRef, handleScroll]);
  // --- End Scroll Velocity Logic --- >

  // --- Virtualization Setup ---
  const rowVirtualizer = useVirtualizer({
    count: groupedRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        // Always fallback to calculated or estimated height
        const rowHeight = groupedRows[index]?.height ?? layoutMetrics.estimatedRowHeightFallback;
        return rowHeight + layoutMetrics.gapSize;
      },
      [groupedRows, layoutMetrics.estimatedRowHeightFallback, layoutMetrics.gapSize, viewMode]
    ),
    overscan: dynamicOverscan, // Use dynamic overscan state
  });

  // Remeasure rows whenever zoom, containerWidth, row count, row height fallback, gap size, view mode, or grouping changes
  useLayoutEffect(() => {
    rowVirtualizer.measure?.();
  }, [
    zoom,
    containerWidth,
    groupedRows.length,
    layoutMetrics.estimatedRowHeightFallback,
    layoutMetrics.gapSize,
    viewMode,
    debouncedIsGrouped,
    folderPath,
  ]);

  // Get the virtual items to render
  const virtualItems = rowVirtualizer.getVirtualItems();

  // --- End Virtualization Setup ---

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
          // Pass the relevant data to context
          setHoverState({ isHovering: true, position: data.position, color: data.color });
        }, 150); // 150ms delay
      } else {
        // If mouse leaves, immediately deactivate hover state
        setHoverState({ isHovering: false, position: null, color: null });
      }
    },
    [setHoverState] // Dependency remains setHoverState
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

  // Callback function to get the correct image URL
  const getImageUrl = useCallback((imagePath: string) => {
    // 1. Replace backslashes with forward slashes
    let path = imagePath.replace(/\\/g, '/');
    // 2. Check if it already starts with '/api/image/' or just '/'. If so, use it directly.
    if (path.startsWith('/api/image/') || path.startsWith('/')) {
      // Assume it's already a usable path
      return path;
    }
    // 3. Otherwise, prepend the API prefix
    return `/api/image/${path}`;
  }, []);

  // Enhanced renderContent using virtualization for GRID view
  const renderContent = () => {
    const { gapSize } = layoutMetrics;
    if (!containerWidth) return null;
    const currentImages = images ?? [];
    const MotionWrapper = motion.div;

    // Determine if we should show skeletons (initial load)
    const showSkeletons = isLoading && !isPlaceholderData;

    // Handle non-GRID view modes
    if (viewMode !== ViewMode.GRID) {
      let ViewComponent;
      switch (viewMode) {
        case ViewMode.MASONRY:
          ViewComponent = MasonryView;
          break;
        case ViewMode.BANNER:
          ViewComponent = BannerView;
          break;
        case ViewMode.CAROUSEL:
          ViewComponent = CarouselView;
          break;
        default:
          return null;
      }
      // Placeholder: Add transitions/loading for non-grid views if needed
      return <ViewComponent images={currentImages} zoom={zoom} />;
    }

    // --- GRID View Logic with Virtualization --- //

    // Show skeletons only on initial load for GRID view
    if (showSkeletons) {
      // We might need a wrapper here if renderSkeletons doesn't provide one
      // Use the calculated metrics for skeletons
      return renderSkeletons();
    }

    // Render the virtualized list when data is ready
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
            position: 'relative', // Often needed for absolute children
          }}
        >
          {virtualItems.map(virtualItem => {
            const row = groupedRows[virtualItem.index];
            if (!row) return null; // Should not happen if count is correct

            return (
              <div // Wrapper for each virtual row with positioning
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement} // Optional: for dynamic height measurement
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ImageRow
                  // Pass necessary props down
                  images={row.images}
                  imageWidths={row.imageWidths ?? []}
                  onImageClick={handleImageClick}
                  columns={columns}
                  zoom={zoom}
                  isLastRow={virtualItem.index === groupedRows.length - 1}
                  rowHeight={row.height}
                  groupedImages={groupedImages}
                  workerPool={workerPool}
                  gap={gapSize} // Use calculated gapSize
                  containerWidth={containerWidth}
                  onImageHover={handleImageHover}
                  onImageLoadError={handleImageLoadError}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
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

  // --- Color Extraction Logic ---

  // Debounced function to update context
  const debouncedSetContextColor = useCallback(
    debounce(async (imageUrl: string | null) => {
      if (!imageUrl || !facRef.current) return;
      try {
        // Ensure getImageUrl provides full path or handle relative paths
        const color = await facRef.current.getColorAsync(imageUrl);
        if (color.hex) {
          setDominantColors([color.hex]); // Update context with the single dominant color
        }
      } catch (e) {
        console.error('Error getting average color:', e);
      }
    }, 300), // Debounce delay (ms)
    [setDominantColors, getImageUrl] // Added getImageUrl dependency
  );

  // Effect to set initial color on first load
  useEffect(() => {
    if (images && images.length > 0 && lastProcessedRowIndexRef.current === null) {
      const firstImage = images[0];
      if (firstImage?.src) {
        const imageUrl = getImageUrl(firstImage.src); // Use helper
        // Call directly without debounce for initial set
        void (async () => {
          if (!imageUrl || !facRef.current) return;
          try {
            const color = await facRef.current.getColorAsync(imageUrl);
            if (color.hex) {
              setDominantColors([color.hex]);
              lastProcessedRowIndexRef.current = 0; // Mark first row as processed
            }
          } catch (e) {
            console.error('Error getting initial average color:', e);
          }
        })();
      }
    }
    // Run only when images are first loaded or getImageUrl changes
  }, [images, getImageUrl, setDominantColors]);

  // --- Render Skeletons --- (Copied from pasted version, uses layoutMetrics)
  const renderSkeletons = useCallback(() => {
    // Use pre-calculated metrics
    const { gapSize } = layoutMetrics;
    // Estimate width/height based on columns and aspect ratio - needs refinement if possible
    const approxWidth =
      containerWidth > 0 && columns > 0 ? containerWidth / columns - gapSize : 200;
    const approxHeight = avgAspectRatio > 0 ? approxWidth / avgAspectRatio : 150;

    const skeletonCount = columns * 5; // Estimate: 5 rows of skeletons

    // Return null if dimensions are invalid
    if (approxWidth <= 0 || approxHeight <= 0) {
      return null;
    }

    return (
      <motion.div
        key="skeleton-grid"
        className={styles.gridContainer} // Use gridContainer for layout?
        style={{
          gap: `${gapSize}px`, // Apply gap for skeleton layout
          // gridTemplateColumns: `repeat(${columns}, 1fr)` // Example if using CSS grid
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ImageSkeleton
            key={`skeleton-${i}`}
            containerWidth={Math.round(approxWidth)}
            containerHeight={Math.round(approxHeight)}
          />
        ))}
      </motion.div>
    );
  }, [columns, layoutMetrics, containerWidth, avgAspectRatio, styles.gridContainer]); // Dependencies

  // Handle Error State
  if (isError) {
    return (
      <div ref={feedRef} className={`${styles.container} ${styles.error}`}>
        Error loading images: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Handle Loading State (show skeletons only on initial load, respect restored state)
  // Now, restoredState only affects scroll, not initial render with skeletons
  const showLoadingSkeletons = isLoading && !isPlaceholderData; // Simpler condition

  if (showLoadingSkeletons) {
    return (
      <div ref={feedRef} className={styles.container}>
        <div className={`${styles.feed} ${styles.loading}`}>
          {/* Render skeletons based on estimated layout */}
          {renderSkeletons()}
        </div>
      </div>
    );
  }

  // Handle Empty State (after loading and no errors)
  // Check images directly from useFolderImages result, not just processed/grouped ones
  const hasNoImages = !isLoading && (!images || images.length === 0);

  if (hasNoImages) {
    return (
      <div ref={feedRef} className={styles.container}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.noImages}>
          No images found for this folder.
        </motion.div>
      </div>
    );
  }

  // Main Render
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
