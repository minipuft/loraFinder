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
import { ImageInfo, ViewMode } from '../types.js';
import { truncateImageTitle } from '../utils/stringUtils.js';
import { ImageHoverData } from './ImageItem.js';
import ImageRow from './ImageRow.js';
import ImageSkeleton from './ImageSkeleton.js';
// import Lottie from 'react-lottie';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FastAverageColor } from 'fast-average-color';
import { ColorContext } from '../contexts/ColorContext';
import { useFolderImages } from '../hooks/query/useFolderImages';
import { useFolders } from '../hooks/query/useFolders';
import useWindowSize from '../hooks/useWindowSize.js';
import { getImages } from '../lib/api';
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

  return debounced;
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
    data: images,
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
  const [processedImages, setProcessedImages] = useState<{
    [key: string]: { low: string; high: string };
  }>({});
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);
  const { setDominantColors, setHoverState } = useContext(ColorContext);
  const facRef = useRef<FastAverageColor | null>(null);
  const lastProcessedRowIndexRef = useRef<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [overscan, setOverscan] = useState<number>(5);
  const [restoredState, setRestoredState] = useState<ScrollState | null>(null);
  const previousFolderPathRef = useRef<string | null>(null);
  const rowHeightsRef = useRef<number[]>([]);
  const isRestoringScrollRef = useRef(false);
  const velocityEMARef = useRef(0); // For smoothing velocity readings
  const OVERSCAN_BASE = 5;
  const OVERSCAN_MAX = 20;
  const EMA_ALPHA = 0.8; // smoothing factor: higher => smoother
  const OVERSCAN_FACTOR = 15; // map velocity to overscan range
  const queryClient = useQueryClient();
  const { data: foldersList } = useFolders();
  const prefetchTriggeredRef = useRef(false);
  const prefetchRef = useRef<HTMLDivElement | null>(null);
  const [isPrefetchVisible, setIsPrefetchVisible] = useState(false);

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
    };
    // Remove containerWidth from dependencies, load immediately
  }, [folderPath, /* containerWidth, */ scrollContainerRef, debouncedSaveScroll]);

  // --- End Scroll Persistence Logic ---

  // Calculate average aspect ratio for fallback estimation
  const avgAspectRatio = useMemo(() => {
    if (!images || images.length === 0) return 1; // Default aspect ratio

    const validImages = images.filter(img => img && img.width > 0 && img.height > 0);
    if (validImages.length === 0) return 1;

    const totalRatio = validImages.reduce((sum, img) => sum + img.width / img.height, 0);
    return totalRatio / validImages.length;
  }, [images]);

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

  // Use global worker pool instead of creating new workers
  const imageProcessor = useMemo(() => WorkerPool.getInstance().getImageProcessor(), []);

  // Cleanup worker when component unmounts
  useEffect(() => {
    return () => {
      if (viewMode === ViewMode.GRID) {
        WorkerPool.getInstance().cleanup();
      }
    };
  }, [viewMode]);

  // Reset states when folder or view mode changes
  useEffect(() => {
    setLightboxIndex(-1);
    setLightboxImages([]);
    setProcessedImages({});
    setRowTransforms([]);
    lastProcessedRowIndexRef.current = null;
    prefetchTriggeredRef.current = false;
    setDominantColors([]);
    // Scroll position is handled by persistence logic, don't reset here
  }, [folderPath, viewMode, setDominantColors]);

  // Initialize FAC instance on mount
  useEffect(() => {
    facRef.current = new FastAverageColor();
    return () => {
      facRef.current?.destroy?.();
    };
  }, []);

  // Enhanced container width management
  useEffect(() => {
    const updateContainerWidth = () => {
      if (!feedRef.current) return;

      const rect = feedRef.current.getBoundingClientRect();
      // Use the actual measured width from the container
      const newWidth = Math.max(MIN_IMAGE_WIDTH, rect.width);

      if (newWidth !== containerWidth) {
        setContainerWidth(newWidth);
        const config: LayoutConfig = {
          containerWidth: newWidth,
          zoom,
          viewMode,
          isGrouped,
        };
        const layout = calculateLayout(config);
        setColumns(layout.columns);
      }
    };

    updateContainerWidth();

    // Add resize observer for more accurate width updates
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (feedRef.current) {
      resizeObserver.observe(feedRef.current);
    }

    window.addEventListener('resize', updateContainerWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [zoom, viewMode, isGrouped, containerWidth, folderPath]);

  // Modified groupedImages calculation with better error handling
  const groupedImages = useMemo(() => {
    if (!Array.isArray(images) || images.length === 0) {
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

    if (!isGrouped) {
      return validImages.map(image => ({
        key: image.id,
        images: [image],
        isCarousel: false,
      }));
    }

    const groups: { [key: string]: ImageInfo[] } = {};
    validImages.forEach(image => {
      const processedTitle = truncateImageTitle(image.alt);
      if (!groups[processedTitle]) {
        groups[processedTitle] = [];
      }
      groups[processedTitle].push(image);
    });

    return Object.entries(groups).map(([key, group]) => ({
      key,
      images: group,
      isCarousel: group.length > 1,
    }));
  }, [images, isGrouped]);

  // Enhanced groupedRows calculation with better error handling and viewMode awareness
  const groupedRows = useMemo(() => {
    if (!containerWidth || groupedImages.length === 0 || viewMode !== ViewMode.GRID) return [];

    const firstImages = groupedImages
      .map(group => group.images[0])
      .filter(image => image && image.width > 0 && image.height > 0);

    if (firstImages.length === 0) return [];

    // Use our optimized distributeImages with dynamic fallback row height
    return distributeImages(
      firstImages,
      containerWidth,
      zoom,
      layoutMetrics.estimatedRowHeightFallback
    );
  }, [groupedImages, zoom, containerWidth, viewMode, layoutMetrics.estimatedRowHeightFallback]);

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
    overscan,
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
    isGrouped,
    folderPath,
  ]);

  // Listen for scroll and adjust overscan based on velocity
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let lastTime = performance.now();
    let lastScrollTop = container.scrollTop;
    let frameId: number;
    const onScroll = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const now = performance.now();
        const scrollTop = container.scrollTop;
        const dy = scrollTop - lastScrollTop;
        const dt = now - lastTime;
        const velocity = Math.abs(dy) / (dt || 1);
        lastTime = now;
        lastScrollTop = scrollTop;
        // Smooth velocity with exponential moving average
        const smoothed = velocityEMARef.current * EMA_ALPHA + velocity * (1 - EMA_ALPHA);
        velocityEMARef.current = smoothed;
        // Map smoothed velocity to overscan delta
        const delta = Math.ceil(smoothed * OVERSCAN_FACTOR);
        // Clamp overscan between base and max
        const newOverscan = Math.min(OVERSCAN_BASE + delta, OVERSCAN_MAX);
        setOverscan(newOverscan);

        // --- Add debounced save on scroll ---
        if (folderPath && rowHeightsRef.current.length > 0 && !isRestoringScrollRef.current) {
          // Pass only scroll position to debounced save
          debouncedSaveScroll(folderPath, scrollTop /*, rowHeightsRef.current, containerWidth */);
        }
        // --- End Add debounced save ---
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frameId);
      // --- Cancel debounced save on unmount ---
      debouncedSaveScroll.cancel?.();
      // --- End Cancel ---
    };
  }, [scrollContainerRef, folderPath, debouncedSaveScroll]);

  // Get the virtual items to render
  const virtualItems = rowVirtualizer.getVirtualItems();
  // --- End Virtualization Setup ---

  // --- Add Scroll Restoration Effect ---
  useLayoutEffect(() => {
    const scrollElement = scrollContainerRef.current;
    // Apply scroll only AFTER data/layout seems ready and state is restored
    // Check virtualItems.length > 0 ensures the list is somewhat rendered
    // Check restoredState directly for scrollTop
    if (scrollElement && restoredState?.scrollTop !== undefined && virtualItems.length > 0) {
      // Check the flag before restoring
      if (isRestoringScrollRef.current) {
        scrollElement.scrollTop = restoredState.scrollTop;
        // Crucially, unset the flag AFTER restoring scroll
        setTimeout(() => {
          isRestoringScrollRef.current = false;
        }, 0);
      }
    } else if (!restoredState) {
      // If there's no state to restore, ensure the flag is false
      isRestoringScrollRef.current = false;
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
                  processedImages={processedImages}
                  imageProcessor={imageProcessor}
                  gap={gapSize} // Use calculated gapSize
                  containerWidth={containerWidth}
                  onImageHover={handleImageHover}
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

  // Reset prefetch flag when folder changes
  useEffect(() => {
    prefetchTriggeredRef.current = false;
  }, [folderPath]);

  // Observe the sentinel element for prefetch
  useEffect(() => {
    const el = prefetchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsPrefetchVisible(true),
      { root: scrollContainerRef.current, rootMargin: '200px' }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  // When sentinel enters view, prefetch next folder images
  useEffect(() => {
    if (isPrefetchVisible && !prefetchTriggeredRef.current && foldersList?.length) {
      const idx = foldersList.findIndex(f => f.name === folderPath);
      const nextFolder = foldersList[idx + 1]?.name;
      if (nextFolder) {
        queryClient
          .fetchQuery({
            queryKey: ['images', nextFolder],
            queryFn: () => getImages(nextFolder),
          })
          .then(nextImages => {
            const batch = nextImages.map(img => ({
              id: img.id,
              src: img.src,
              width: Math.ceil(containerWidth),
              height: Math.ceil(layoutMetrics.estimatedRowHeightFallback),
            }));
            if (batch.length) {
              imageProcessor.postMessage({ action: 'processBatch', images: batch });
            }
          });
        prefetchTriggeredRef.current = true;
      }
    }
  }, [
    isPrefetchVisible,
    foldersList,
    folderPath,
    containerWidth,
    layoutMetrics.estimatedRowHeightFallback,
    queryClient,
    imageProcessor,
  ]);

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
      <div className={styles.feed}>
        {renderContent()}
        {/* Sentinel for prefetching next folder */}
        <div ref={prefetchRef} style={{ width: '100%', height: '1px' }} />
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
