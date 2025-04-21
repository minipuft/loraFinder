import { ImageInfo, ViewMode } from '../types/index.js';

// Constants
export const MIN_IMAGE_WIDTH = 200;
export const MAX_COLUMNS = 7;
export const MIN_COLUMNS = 1;
export const BASE_GAP = 4;
export const MIN_GAP = 2;
export const MAX_GAP = 12;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

// Types
export interface LayoutConfig {
  containerWidth: number;
  zoom: number;
  viewMode: ViewMode;
  isGrouped: boolean;
}

export interface RowConfig {
  width: number;
  height: number;
  gap: number;
  images: ImageInfo[];
  imageWidths?: number[];
  offset?: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// Cache for aspect ratios and dimensions
const aspectRatioCache = new WeakMap<ImageInfo, number>();
const layoutCache = new Map<string, RowConfig[]>();

// Example: Caching sorted order of images
const sortedImagesCache = new Map<string, ImageInfo[]>();

const getSortedImages = (images: ImageInfo[]): ImageInfo[] => {
  // Generate an identifier for the current order; could be a hash of ids
  const cacheKey = images.map(img => img.id).join(',');
  if (sortedImagesCache.has(cacheKey)) {
    return sortedImagesCache.get(cacheKey)!;
  }
  // Sort images by aspect ratio (or any other criteria)
  const sorted = [...images].sort((a, b) => a.width / a.height - b.width / b.height);
  sortedImagesCache.set(cacheKey, sorted);
  return sorted;
};

// Enhanced cache key generation with size awareness
const generateCacheKey = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number,
  viewMode: string
): string => {
  return `${containerWidth}-${zoom}-${viewMode}-${images.map(img => img.id).join(',')}`;
};

// Cache invalidation threshold (in pixels)
const CACHE_INVALIDATION_THRESHOLD = 8;

class SizeAwareCache<T> {
  private cache: Map<string, { data: T; width: number }>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key: string, value: T, width: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { data: value, width });
  }

  get(key: string, currentWidth: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Invalidate cache if width difference exceeds threshold
    if (Math.abs(entry.width - currentWidth) > CACHE_INVALIDATION_THRESHOLD) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Replace existing caches with size-aware versions
const rowLayoutCache = new SizeAwareCache<RowConfig>(100);
const dimensionsCache = new SizeAwareCache<ImageDimensions>(500);

// Core calculation functions
export const calculateColumns = (containerWidth: number, zoom: number): number => {
  const effectiveWidth = containerWidth / zoom;
  const baseColumns = Math.floor(effectiveWidth / (MIN_IMAGE_WIDTH * zoom));
  return Math.min(Math.max(baseColumns, MIN_COLUMNS), MAX_COLUMNS);
};

// Add smooth zoom transition helper
export const interpolateZoom = (
  currentZoom: number,
  targetZoom: number,
  progress: number
): number => {
  return currentZoom + (targetZoom - currentZoom) * progress;
};

export const calculateGapSize = (zoom: number): number => {
  // Normalize zoom level
  const normalizedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

  // Calculate base gap size with finer granularity
  const zoomFactor = (normalizedZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  const baseGap = BASE_GAP * (1 + zoomFactor * 0.25);

  // Round to nearest even number to ensure consistent spacing
  const roundedGap = Math.round(baseGap * 2) / 2;

  // Ensure gap stays within bounds
  return Math.min(Math.max(roundedGap, MIN_GAP), MAX_GAP);
};

// Optimized aspect ratio calculation with caching
const getAspectRatio = (image: ImageInfo): number => {
  let ratio = aspectRatioCache.get(image);
  if (!ratio) {
    ratio = image.width / image.height;
    aspectRatioCache.set(image, ratio);
  }
  return ratio;
};

// Batch process aspect ratios
const batchProcessAspectRatios = (images: ImageInfo[]): number[] => {
  return images.map(getAspectRatio);
};

// Optimized image dimensions calculation with caching
export const calculateImageDimensions = (
  image: ImageInfo,
  containerWidth: number,
  zoom: number
): ImageDimensions => {
  const cacheKey = generateCacheKey([image], containerWidth, zoom, 'dimensions');
  const cachedDimensions = dimensionsCache.get(cacheKey, containerWidth);

  if (cachedDimensions) {
    return cachedDimensions;
  }

  const aspectRatio = getAspectRatio(image);
  const normalizedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

  const maxWidth = Math.min(containerWidth, MIN_IMAGE_WIDTH * MAX_COLUMNS);
  const baseWidth = Math.min(
    Math.max(MIN_IMAGE_WIDTH * normalizedZoom, containerWidth / MAX_COLUMNS),
    maxWidth
  );

  const width = Math.round(baseWidth);
  const height = Math.round(width / aspectRatio);

  const dimensions = { width, height, aspectRatio };
  dimensionsCache.set(cacheKey, dimensions, containerWidth);

  return dimensions;
};

export const detectOverflow = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number
): boolean => {
  const gap = calculateGapSize(zoom);
  const totalWidth = images.reduce((sum, image) => {
    const { width } = calculateImageDimensions(image, containerWidth, zoom);
    return sum + width + gap;
  }, -gap); // Subtract last gap

  return totalWidth > containerWidth;
};

// Add new helper function for calculating optimal row distribution
const calculateOptimalDistribution = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number,
  gap: number
): { idealHeight: number; widths: number[] } => {
  const aspectRatios = batchProcessAspectRatios(images);
  const totalAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);
  const totalGapWidth = Math.max(0, (images.length - 1) * gap);
  const availableWidth = Math.max(0, containerWidth - totalGapWidth);

  // Calculate ideal height that would make images fill the width perfectly
  const idealHeight = availableWidth / totalAspectRatio;

  // Calculate widths based on aspect ratios and ideal height
  const widths = aspectRatios.map(ratio => Math.floor(idealHeight * ratio));

  return { idealHeight, widths };
};

// Enhanced checkRowFit function
const checkRowFit = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number,
  gap: number
): { fits: boolean; idealHeight: number; predictedWidths: number[] } => {
  const { idealHeight, widths } = calculateOptimalDistribution(images, containerWidth, zoom, gap);
  const minWidth = MIN_IMAGE_WIDTH * zoom;

  // Check if any image would be too narrow based on aspect ratio
  const allImagesWideEnough = widths.every(width => width >= minWidth);

  // Calculate total width including gaps
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + (images.length - 1) * gap;

  return {
    fits: allImagesWideEnough && totalWidth <= containerWidth,
    idealHeight,
    predictedWidths: widths,
  };
};

// Update distributeImages function
export const distributeImages = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number,
  targetRowHeight: number = 200
): RowConfig[] => {
  if (containerWidth <= 0 || images.length === 0) {
    console.warn('Invalid input detected');
    return [];
  }

  const sortedImages = getSortedImages(images);
  const gap = calculateGapSize(zoom);
  const rows: RowConfig[] = [];
  let currentRow: ImageInfo[] = [];
  let currentRowAspectRatio = 0;

  for (let i = 0; i < sortedImages.length; i++) {
    const testRow = [...currentRow, sortedImages[i]];
    const { fits, idealHeight, predictedWidths } = checkRowFit(testRow, containerWidth, zoom, gap);

    if (!fits && currentRow.length > 0) {
      // --- Finalize the current row ---
      const { idealHeight, widths: currentWidths } = calculateOptimalDistribution(
        currentRow,
        containerWidth,
        zoom,
        gap
      );
      const rowHeight = Math.floor(idealHeight);
      // Adjust widths to fit exactly
      const totalGapWidth = Math.max(0, (currentRow.length - 1) * gap);
      let calculatedWidthSum = 0;
      const adjustedWidths = currentRow.map((img, index) => {
        const width = Math.floor(getAspectRatio(img) * rowHeight);
        calculatedWidthSum += width;
        return width;
      });

      // Distribute remainder/deficit due to flooring
      const discrepancy = containerWidth - totalGapWidth - calculatedWidthSum;
      if (discrepancy !== 0 && adjustedWidths.length > 0) {
        // Add discrepancy to the last image for simplicity
        adjustedWidths[adjustedWidths.length - 1] += discrepancy;
      }

      rows.push({
        width: containerWidth,
        height: rowHeight,
        gap,
        images: currentRow,
        imageWidths: adjustedWidths, // Use adjusted widths
        offset: 0,
      });
      // --- End finalize current row ---

      // Start new row with current image
      currentRow = [sortedImages[i]];
      currentRowAspectRatio = getAspectRatio(sortedImages[i]);
    } else {
      // Add image to current row
      currentRow = testRow;
      currentRowAspectRatio += getAspectRatio(sortedImages[i]);
    }
  }

  // Handle last row
  if (currentRow.length > 0) {
    // --- Finalize the last row ---
    const { idealHeight, widths: initialWidths } = calculateOptimalDistribution(
      currentRow,
      containerWidth,
      zoom,
      gap
    );
    const rowHeight = Math.floor(idealHeight);
    // Adjust widths to fit exactly
    const totalGapWidth = Math.max(0, (currentRow.length - 1) * gap);
    let calculatedWidthSum = 0;
    const adjustedWidths = currentRow.map((img, index) => {
      const width = Math.floor(getAspectRatio(img) * rowHeight);
      calculatedWidthSum += width;
      return width;
    });

    // Distribute remainder/deficit due to flooring
    const discrepancy = containerWidth - totalGapWidth - calculatedWidthSum;
    if (discrepancy !== 0 && adjustedWidths.length > 0) {
      // Add discrepancy to the last image for simplicity
      adjustedWidths[adjustedWidths.length - 1] += discrepancy;
    }

    rows.push({
      width: containerWidth,
      height: rowHeight,
      gap,
      images: currentRow,
      imageWidths: adjustedWidths, // Use adjusted widths
      offset: 0,
    });
    // --- End finalize last row ---
  }

  return rows;
};

// Helper function to create a centered row
const createCenteredRow = (
  images: ImageInfo[],
  containerWidth: number,
  zoom: number,
  gap: number
): RowConfig => {
  const aspectRatios = batchProcessAspectRatios(images);
  const totalAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);

  // Calculate total gap width for all spaces between images
  const totalGapWidth = Math.max(0, (images.length - 1) * gap);

  // Calculate actual width available for images by subtracting gaps
  const availableWidth = Math.max(0, containerWidth - totalGapWidth);

  // Calculate row height based on available width for images only
  const idealHeight = availableWidth / totalAspectRatio;

  // Calculate image widths based on aspect ratios and available width
  const imageWidths = aspectRatios.map(ratio => Math.floor(idealHeight * ratio));

  // Calculate actual total width including gaps
  const totalWidth = imageWidths.reduce((sum, width) => sum + width, 0) + totalGapWidth;

  // Distribute any remaining pixels to prevent rounding issues
  const remainingPixels = containerWidth - totalWidth;
  if (remainingPixels > 0 && imageWidths.length > 0) {
    // Add remaining pixels to the first image to maintain alignment
    imageWidths[0] += remainingPixels;
  }

  // Calculate centering offset
  const offset = Math.floor((containerWidth - totalWidth) / 2);

  return {
    width: containerWidth,
    height: Math.floor(idealHeight),
    gap,
    images,
    imageWidths,
    offset,
  };
};

// Optimized row layout calculation
export const optimizeRowLayout = (
  row: RowConfig,
  containerWidth: number,
  zoom: number
): RowConfig => {
  if (containerWidth <= 0) {
    console.warn('Invalid container width detected in optimizeRowLayout');
    return row;
  }

  const cacheKey = generateCacheKey(row.images, containerWidth, zoom, 'row');
  const cachedLayout = rowLayoutCache.get(cacheKey, containerWidth);
  if (cachedLayout) {
    return cachedLayout;
  }

  const normalizedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const baseGap = calculateGapSize(normalizedZoom);

  // Ensure integer gaps to prevent rounding issues
  const gap = Math.round(baseGap);

  // Calculate total gap width for all spaces between images
  const totalGapWidth = Math.max(0, (row.images.length - 1) * gap);

  // Calculate actual width available for images by subtracting all gaps
  const availableWidth = Math.max(0, containerWidth - totalGapWidth);

  const aspectRatios = batchProcessAspectRatios(row.images);
  const totalAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);

  // Calculate ideal height based on available width for images only
  const idealHeight = availableWidth / totalAspectRatio;
  const minRequiredHeight = (MIN_IMAGE_WIDTH * zoom) / Math.max(...aspectRatios);
  const maxAllowedHeight = availableWidth / totalAspectRatio;
  const rowHeight = Math.round(
    Math.max(minRequiredHeight, Math.min(maxAllowedHeight, idealHeight))
  );

  // Calculate initial image widths based on aspect ratios
  const imageWidths = aspectRatios.map(ratio => Math.floor(rowHeight * ratio));

  // Calculate total width of all images
  const totalImageWidth = imageWidths.reduce((sum, width) => sum + width, 0);

  // Calculate the remaining width to distribute
  const remainingWidth = availableWidth - totalImageWidth;

  if (remainingWidth !== 0 && imageWidths.length > 0) {
    // Distribute remaining width evenly among all images
    const widthPerImage = Math.floor(remainingWidth / imageWidths.length);
    const extraPixels = remainingWidth % imageWidths.length;

    // Add base distribution to all images
    imageWidths.forEach((_, index) => {
      imageWidths[index] += widthPerImage;
    });

    // Add any extra pixels to the first few images
    for (let i = 0; i < extraPixels; i++) {
      imageWidths[i] += 1;
    }
  }

  // Verify total width matches container width exactly
  const finalTotalWidth = imageWidths.reduce((sum, width) => sum + width, 0) + totalGapWidth;
  if (finalTotalWidth !== containerWidth && imageWidths.length > 0) {
    // Add any remaining pixels to the first image
    const diff = containerWidth - finalTotalWidth;
    imageWidths[0] += diff;
  }

  const optimizedRow = {
    ...row,
    width: containerWidth,
    height: rowHeight,
    gap,
    imageWidths,
  };

  rowLayoutCache.set(cacheKey, optimizedRow, containerWidth);
  return optimizedRow;
};

// Layout calculation for different view modes
export const calculateLayout = (config: LayoutConfig) => {
  const { containerWidth, zoom, viewMode, isGrouped } = config;
  const columns = calculateColumns(containerWidth, zoom);
  const gap = calculateGapSize(zoom);

  return {
    columns,
    gap,
    minImageWidth: MIN_IMAGE_WIDTH * zoom,
    maxImageWidth: containerWidth / columns - gap,
  };
};

// Utility function for maintaining aspect ratio
export const maintainAspectRatio = (
  image: ImageInfo,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } => {
  const aspectRatio = getAspectRatio(image);
  const containerRatio = containerWidth / containerHeight;

  if (aspectRatio > containerRatio) {
    return {
      width: containerWidth,
      height: Math.round(containerWidth / aspectRatio),
    };
  }

  return {
    width: Math.round(containerHeight * aspectRatio),
    height: containerHeight,
  };
};
