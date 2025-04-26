import { AnimatePresence, motion } from 'framer-motion';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MotionPreset from '../animations/MotionPreset';
import { ProcessedImageUpdate, useImageProcessing } from '../contexts/ImageProcessingContext';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types/index.js';
import { truncateImageTitle } from '../utils/stringUtils.js';

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

// Define animation variants
const placeholderVariants = {
  initial: { opacity: 1, scale: 1, filter: 'blur(0px)' }, // Start fully visible
  exit: {
    // Animate out when isHighResLoaded becomes true
    opacity: 0,
    scale: 0.98, // Slight scale down
    // filter: 'blur(10px)', // Optional blur out
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
      duration: 0.3, // Allow spring to resolve faster
    },
  },
};

const imageVariants = {
  initial: { opacity: 0, scale: 0.98 }, // Start hidden and slightly smaller
  animate: {
    // Animate in when isHighResLoaded becomes true
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 25,
      delay: 0.05, // Slight delay to ensure placeholder starts exiting
    },
  },
};

// ResponsiveImage component (Refined & Forwarding Ref)
interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  isProcessed: boolean;
  onLoad: () => void;
  onError: () => void;
  className?: string;
  style?: React.CSSProperties;
  animate?: 'initial' | 'animate'; // Control animation state from parent
}

const ResponsiveImage = React.forwardRef<HTMLImageElement, ResponsiveImageProps>(
  (
    { src, alt, width, isProcessed, onLoad, onError, className, style, animate = 'initial' },
    ref
  ) => {
    const handleLoad = useCallback(() => {
      onLoad();
    }, [onLoad]);

    const handleError = useCallback(() => {
      onError();
    }, [onError]);

    const useSrcSet = !isProcessed && width && !src.startsWith('blob:');
    const srcSet = useSrcSet
      ? [
          `${src}&w=${Math.round(width as number)} 1x`,
          `${src}&w=${Math.round((width as number) * 2)} 2x`,
          `${src}&w=${Math.round((width as number) * 3)} 3x`,
        ].join(', ')
      : undefined;
    const sizes = useSrcSet ? `${Math.round(width as number)}px` : undefined;

    return (
      <motion.img
        ref={ref}
        key={src}
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading="lazy"
        variants={imageVariants}
        initial="initial"
        animate={animate}
        onLoad={handleLoad}
        onError={handleError}
        srcSet={srcSet}
        sizes={sizes}
      />
    );
  }
);
ResponsiveImage.displayName = 'ResponsiveImage';

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
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
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
    if (hasError) return '';
    if (processedUrls.high) return processedUrls.high;
    if (processedUrls.low) return processedUrls.low;
    return image.src;
  }, [image.src, processedUrls, hasError]);

  const isProcessed = !!(processedUrls.low || processedUrls.high);

  const handleImageLoad = useCallback(() => {
    if (imageUrl === processedUrls.high || (!processedUrls.high && imageUrl === image.src)) {
      setIsHighResLoaded(true);
    }
    setHasError(false);
  }, [imageUrl, processedUrls.high, image.src, image.id]);

  const handleImageError = useCallback(() => {
    console.error(`ImageItem: Failed to load image ${image.id}`, imageUrl);
    setHasError(true);
    onImageLoadError(image.id);
  }, [image.id, imageUrl, onImageLoadError]);

  const truncatedTitle = useMemo(
    () => truncateImageTitle(image.alt || image.title || 'Untitled'),
    [image.alt, image.title]
  );

  return (
    <MotionPreset
      as="div"
      preset="hoverPop"
      className={`${styles.imageItem} group`}
      layout
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(image)}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: aspectRatio,
      }}
      initial={false}
      animate={false}
    >
      <AnimatePresence>
        {!isHighResLoaded && !hasError && (
          <motion.div
            key="placeholder"
            className={styles.placeholder}
            style={{ '--placeholder-color': placeholderColor } as React.CSSProperties}
            variants={placeholderVariants}
            initial="initial"
            exit="exit"
          />
        )}
      </AnimatePresence>

      {!hasError && imageUrl && (
        <ResponsiveImage
          ref={imageRef}
          key={imageUrl}
          src={imageUrl}
          alt={image.alt ?? ''}
          width={targetWidth}
          isProcessed={isProcessed}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`${styles.imageElement}`}
          style={{ position: 'absolute', inset: 0 }}
          animate={isHighResLoaded ? 'animate' : 'initial'}
        />
      )}

      {hasError && <div className={styles.errorIndicator}>Error</div>}

      {!hasError && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className={styles.title}>{truncatedTitle}</p>
        </motion.div>
      )}

      {!hasError && groupCount && groupCount > 1 && (
        <div className={styles.groupIndicator}>{groupCount}</div>
      )}
    </MotionPreset>
  );
};

export default memo(ImageItem);
