import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import { useDragContext } from '../contexts/DragContext';
import { ProcessedImageUpdate, useImageProcessing } from '../contexts/ImageProcessingContext';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types/index.js';
import ErrorBoundary from './ErrorBoundary';
import ImageSkeleton from './ImageSkeleton';
import SuspenseImage from './lazy/SuspenseImage';

// Define hover data payload
export interface ImageHoverData {
  isHovering: boolean;
  position: { x: number; y: number } | null; // Normalized coordinates relative to viewport/background
  color: string | null; // Dominant color of the image, if available
  imageId: string;
}

// Type for the processed image callback data
interface ProcessedImageData {
  id: string;
  quality: 'low' | 'high';
  processedImage: string;
}

interface ImageItemProps {
  image: ImageInfo;
  onClick: (image: ImageInfo) => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  groupCount?: number;
  onResize?: (width: number, height: number) => void;
  width: number;
  height: number;
  isCarousel?: boolean;
  groupImages?: ImageInfo[];
  onImageHover: (data: ImageHoverData) => void;
  onImageLoadError: (imageId: string) => void;
  dominantColor?: string | null;
  activeId?: string | null;
  isDropTarget?: boolean;
  dropPosition?: 'before' | 'after' | null;
}

const ImageItem: React.FC<ImageItemProps> = ({
  image,
  onClick,
  containerWidth,
  containerHeight,
  zoom = 1,
  groupCount,
  width,
  height,
  isCarousel = false,
  onImageHover,
  onImageLoadError,
  dominantColor,
  activeId,
  isDropTarget = false,
  dropPosition = null,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [processedUrls, setProcessedUrls] = useState<{ low?: string; high?: string }>({});
  const [hasError, setHasError] = useState(false);
  const { subscribeToImageUpdates } = useImageProcessing();

  // Get activeId from context to disable passive hover during drag
  const { activeId: globalActiveId, itemDropTarget: contextItemDropTarget } = useDragContext();

  // --- Animation Setup ---
  const pipeline = useAnimationPipeline(`item-${image.id}`); // Use PER-ITEM scope
  const itemRef = useRef<HTMLDivElement | null>(null);
  const indicatorBeforeRef = useRef<HTMLDivElement>(null);
  const indicatorAfterRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: image.id,
    disabled: isCarousel,
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    position: 'relative',
    touchAction: 'none',
  };

  const placeholderColor = useMemo(() => {
    return dominantColor || '#333';
  }, [dominantColor]);

  const targetWidth = containerWidth;
  const targetHeight = containerHeight;

  const aspectRatio = useMemo(() => {
    if (image.width && image.height && image.width > 0 && image.height > 0) {
      return `${image.width} / ${image.height}`;
    }
    if (targetWidth > 0 && targetHeight > 0) {
      return `${targetWidth} / ${targetHeight}`;
    }
    return '1 / 1';
  }, [image.width, image.height, targetWidth, targetHeight]);

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // --- Disable passive hover if anything is being dragged --- >
      if (globalActiveId !== null) return;

      // Trigger passive hover animation
      pipeline
        .clear()
        .addStep({ target: itemRef.current!, preset: 'itemPassiveHoverStart' })
        .play();

      // Existing AuraBackground update logic (optional)
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normalizedX = centerX / window.innerWidth;
      const normalizedY = centerY / window.innerHeight;
      onImageHover({
        // Prop call for Aura background / other parent logic
        isHovering: true,
        position: { x: normalizedX, y: normalizedY },
        color: dominantColor || null,
        imageId: image.id,
      });
    },
    [globalActiveId, pipeline, onImageHover, image.id, dominantColor] // Add deps
  );

  const handleMouseLeave = useCallback(
    () => {
      // --- Disable passive hover end if anything is being dragged --- >
      if (globalActiveId !== null) return;

      // Trigger passive hover end animation
      pipeline.clear().addStep({ target: itemRef.current!, preset: 'itemPassiveHoverEnd' }).play();

      // Existing AuraBackground update logic (optional)
      onImageHover({
        // Prop call for Aura background / other parent logic
        isHovering: false,
        position: null,
        color: null,
        imageId: image.id,
      });
    },
    [globalActiveId, pipeline, onImageHover, image.id] // Add deps
  );

  const handleProcessedImageUpdate = useCallback(
    (data: ProcessedImageUpdate) => {
      console.log(`[ImageItem ${image.id}] Received processed data via context: ${data.quality}`);
      setProcessedUrls(prev => ({
        ...prev,
        [data.quality]: data.imageUrl,
      }));
    },
    [image.id]
  );

  useEffect(() => {
    const unsubscribe = subscribeToImageUpdates(image.id, handleProcessedImageUpdate);
    return () => unsubscribe();
  }, [image.id, subscribeToImageUpdates, handleProcessedImageUpdate]);

  useEffect(() => {
    const currentLowUrl = processedUrls.low;
    const currentHighUrl = processedUrls.high;
    if (currentLowUrl) {
      console.log(`[ImageItem ${image.id}] Revoking low-res blob URL on unmount: ${currentLowUrl}`);
      URL.revokeObjectURL(currentLowUrl);
    }
    if (currentHighUrl) {
      console.log(
        `[ImageItem ${image.id}] Revoking high-res blob URL on unmount: ${currentHighUrl}`
      );
      URL.revokeObjectURL(currentHighUrl);
    }
  }, []);

  const imageUrl = useMemo(() => {
    if (processedUrls.high) return processedUrls.high;
    if (processedUrls.low) return processedUrls.low;
    return image.src;
  }, [image.src, processedUrls]);

  const handleImageError = useCallback(() => {
    console.error(`[ImageItem ${image.id}] Failed to load image: ${imageUrl}`);
    setHasError(true);
    onImageLoadError(image.id);
    if (imageUrl === processedUrls.high || imageUrl === processedUrls.low) {
      setProcessedUrls({});
    }
  }, [imageUrl, image.id, onImageLoadError, processedUrls]);

  const handleClick = useCallback(() => {
    onClick(image);
  }, [onClick, image]);

  if (hasError) {
    return (
      <div
        className={`${styles.imageItem} ${styles.imageError}`}
        style={{
          width: targetWidth,
          height: targetHeight,
          aspectRatio: aspectRatio,
        }}
      >
        Error
      </div>
    );
  }

  const itemClassName = `
    ${styles.imageItem}
    ${isDragging ? styles.isDragging : ''}
  `;

  // --- Effects for Drag/Drop Animations --- >

  // Effect for *being* the dragged item
  useEffect(() => {
    if (isDragging) {
      // Use isDragging from useSortable
      console.log(`[ImageItem ${image.id}] Drag Start (isDragging true)`);
      pipeline.clear().addStep({ target: itemRef.current!, preset: 'itemDragStart' }).play();
    } else {
      // Check previous state if needed, or just revert if not dragging
      // This might conflict if it's a drop target, handled by the next effect
      console.log(`[ImageItem ${image.id}] Drag End (isDragging false)`);
      // Ensure revert only happens if NOT ALSO a drop target ending
      if (!isDropTarget) {
        // Use prop isDropTarget
        pipeline
          .clear()
          .addStep({ target: itemRef.current!, preset: 'itemDropTargetNormal' })
          .play();
      }
    }
  }, [isDragging, image.id, pipeline, isDropTarget]); // Added isDropTarget

  // Effect for *being* the drop target (drag hover)
  useEffect(() => {
    if (isDropTarget) {
      // Use the prop passed down
      console.log(`[ImageItem ${image.id}] Drop Target Enter (isDropTarget true)`);
      pipeline
        .clear()
        .addStep({ target: itemRef.current!, preset: 'itemDropTargetHoverStart' })
        .play(); // Use new preset

      // Show indicators
      pipeline.addStep({
        target: indicatorBeforeRef.current!,
        preset: dropPosition === 'before' ? 'showIndicator' : 'hideIndicator',
      });
      pipeline.addStep({
        target: indicatorAfterRef.current!,
        preset: dropPosition === 'after' ? 'showIndicator' : 'hideIndicator',
      });
      pipeline.play();
    } else {
      // Check if previously was drop target to trigger end animation
      // This requires tracking previous isDropTarget state or careful checks
      // Simpler: If not the drop target, ensure revert animation plays *unless* it's being dragged
      console.log(`[ImageItem ${image.id}] Drop Target Leave (isDropTarget false)`);
      if (!isDragging) {
        // Only revert if not currently being dragged
        pipeline
          .clear()
          .addStep({ target: itemRef.current!, preset: 'itemDropTargetHoverEnd' })
          .play(); // Use new preset
      }
      // Hide indicators
      pipeline.addStep({ target: indicatorBeforeRef.current!, preset: 'hideIndicator' });
      pipeline.addStep({ target: indicatorAfterRef.current!, preset: 'hideIndicator' });
      pipeline.play();
    }
  }, [isDropTarget, dropPosition, image.id, pipeline, isDragging]); // Added isDragging

  return (
    <motion.div
      data-image-id={image.id}
      ref={node => {
        // Combine refs using callback pattern
        setNodeRef(node);
        itemRef.current = node;
      }}
      className={itemClassName}
      style={{
        width: targetWidth,
        height: targetHeight,
        aspectRatio: aspectRatio,
        backgroundColor: placeholderColor,
        ...sortableStyle,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...attributes}
      {...listeners}
      layout
    >
      {/* Indicators */}
      <div ref={indicatorBeforeRef} className={styles.indicatorBefore} />
      <div ref={indicatorAfterRef} className={styles.indicatorAfter} />

      <div className={styles.imageItemInner} onClick={handleClick}>
        <ErrorBoundary fallback={<div className={styles.imageError}>Error</div>}>
          <Suspense
            fallback={
              <ImageSkeleton
                containerWidth={targetWidth}
                containerHeight={targetHeight}
                placeholderColor={placeholderColor}
              />
            }
          >
            <SuspenseImage
              src={imageUrl}
              alt={image.alt || 'Image'}
              className={`${styles.image} ${styles.smooth}`}
              onError={handleImageError}
              width={targetWidth}
              height={targetHeight}
              loading="lazy"
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {groupCount && groupCount > 1 && !isCarousel && (
        <div className={styles.groupCount}>+{groupCount}</div>
      )}
    </motion.div>
  );
};

export default memo(ImageItem);
