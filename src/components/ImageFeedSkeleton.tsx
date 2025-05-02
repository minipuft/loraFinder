import React, { useMemo } from 'react';
import styles from '../styles/ImageFeedSkeleton.module.scss'; // Create this SCSS module
import { ViewMode } from '../types';
import { calculateGapSize, calculateLayout, LayoutConfig } from '../utils/layoutCalculator';
import ImageSkeleton from './ImageSkeleton.js'; // Assuming .js extension based on ImageFeed import

interface ImageFeedSkeletonProps {
  folder: string; // Used for keying or potential future use
  zoom: number;
  viewMode: ViewMode;
  isGrouped: boolean; // May influence skeleton layout in future
  containerWidth: number | undefined;
}

const ESTIMATED_IMAGES_PER_SKELETON = 20; // Adjust as needed

const ImageFeedSkeleton: React.FC<ImageFeedSkeletonProps> = ({
  zoom,
  viewMode,
  isGrouped,
  containerWidth,
}) => {
  const { columns, estimatedRowCount, gapSize } = useMemo(() => {
    if (!containerWidth || containerWidth <= 0 || viewMode !== ViewMode.GRID) {
      return { columns: 4, estimatedRowCount: 5, gapSize: 16 }; // Default fallback
    }

    const config: LayoutConfig = {
      containerWidth,
      zoom,
      viewMode,
      isGrouped,
    };
    const layout = calculateLayout(config);
    const calculatedGap = calculateGapSize(zoom);
    // Estimate rows based on a fixed number of items for simplicity
    const rows = Math.ceil(ESTIMATED_IMAGES_PER_SKELETON / layout.columns);

    return {
      columns: layout.columns,
      estimatedRowCount: rows > 0 ? rows : 1, // Ensure at least one row
      gapSize: calculatedGap,
    };
  }, [containerWidth, zoom, viewMode, isGrouped]);

  // Calculate estimated width/height for skeleton items
  const estimatedItemDimensions = useMemo(() => {
    if (!containerWidth || containerWidth <= 0 || columns <= 0) {
      return { width: 150, height: 150 }; // Default fallback size
    }
    const totalGapWidth = (columns - 1) * gapSize;
    const availableWidth = containerWidth - totalGapWidth - gapSize; // Account for padding
    const estimatedWidth = Math.max(50, Math.floor(availableWidth / columns));
    const estimatedHeight = estimatedWidth; // Use 1:1 aspect ratio for skeleton
    return { width: estimatedWidth, height: estimatedHeight };
  }, [containerWidth, columns, gapSize]);

  // Generate placeholder items
  const skeletonItems = useMemo(() => {
    return Array.from({ length: columns * estimatedRowCount }, (_, index) => index);
  }, [columns, estimatedRowCount]);

  // Only render skeleton for GRID view currently
  if (viewMode !== ViewMode.GRID || !containerWidth || containerWidth <= 0) {
    // Render a simpler, generic loading state for other views or if width is unknown
    return <div className={styles.loadingFallback}>Loading... {/* Or a Spinner component */}</div>;
  }

  return (
    <div
      className={styles.skeletonGrid}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gapSize}px`,
        padding: `${gapSize / 2}px`, // Consistent padding
      }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading images"
    >
      {skeletonItems.map(index => (
        <ImageSkeleton
          key={`skeleton-${index}`}
          containerWidth={estimatedItemDimensions.width}
          containerHeight={estimatedItemDimensions.height}
          placeholderColor={undefined} // No color fetching in skeleton
        />
      ))}
    </div>
  );
};

export default ImageFeedSkeleton;
