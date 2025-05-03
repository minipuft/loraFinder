import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dragItemVariants } from '../animations/dragReorderAnimations';
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

  const isCurrentlyDragging = activeId === image.id;

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
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normalizedX = centerX / window.innerWidth;
      const normalizedY = centerY / window.innerHeight;
      onImageHover({
        isHovering: true,
        position: { x: normalizedX, y: normalizedY },
        color: dominantColor || null,
        imageId: image.id,
      });
    },
    [onImageHover, image.id, dominantColor]
  );

  const handleMouseLeave = useCallback(() => {
    onImageHover({
      isHovering: false,
      position: null,
      color: null,
      imageId: image.id,
    });
  }, [onImageHover, image.id]);

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

    return () => {
      unsubscribe();
    };
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
    ${isDropTarget ? styles.isDropTarget : ''}
    ${isDropTarget && dropPosition === 'before' ? styles.dropBefore : ''}
    ${isDropTarget && dropPosition === 'after' ? styles.dropAfter : ''}
  `;

  return (
    <motion.div
      ref={setNodeRef}
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
      variants={dragItemVariants}
      animate={isDragging ? 'dragging' : 'initial'}
    >
      {isDropTarget && dropPosition === 'before' && (
        <div className={styles.dropIndicatorBefore} data-position="before"></div>
      )}
      {isDropTarget && dropPosition === 'after' && (
        <div className={styles.dropIndicatorAfter} data-position="after"></div>
      )}

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
