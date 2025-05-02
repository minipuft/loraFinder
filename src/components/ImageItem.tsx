import { motion } from 'framer-motion';
import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  isCarousel: boolean;
  groupImages: ImageInfo[];
  onImageHover: (data: ImageHoverData) => void;
  onImageLoadError: (imageId: string) => void;
  dominantColor?: string | null; // Added optional prop for color from worker
}

const ImageItem: React.FC<ImageItemProps> = ({
  image,
  onClick,
  containerWidth,
  containerHeight,
  zoom = 1,
  groupCount,
  onResize,
  width,
  height,
  isCarousel = false,
  groupImages = [],
  onImageHover,
  onImageLoadError,
  dominantColor,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [processedUrls, setProcessedUrls] = useState<{ low?: string; high?: string }>({});
  const [hasError, setHasError] = useState(false);
  const { subscribeToImageUpdates } = useImageProcessing();

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

  useEffect(() => {
    if (onResize) {
      onResize(targetWidth, targetHeight);
    }
  }, [targetWidth, targetHeight, onResize]);

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

  return (
    <motion.div
      className={styles.imageItemContainer}
      layout
      style={{
        width: targetWidth,
        height: targetHeight,
        maxWidth: '100%',
        aspectRatio: aspectRatio,
        position: 'relative',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={image.title || 'Image'}
    >
      <ErrorBoundary
        fallback={<div className={`${styles.imageItem} ${styles.imageError}`}>Error</div>}
      >
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
            key={imageUrl}
            src={imageUrl}
            alt={image.alt || image.title || ''}
            className={styles.imageItemImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={handleImageError}
          />
        </Suspense>
      </ErrorBoundary>
    </motion.div>
  );
};

export default memo(ImageItem);
