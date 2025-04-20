import { motion } from 'framer-motion';
import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ColorContext } from '../contexts/ColorContext';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types.js';
import AnimationSystem from '../utils/AnimationSystem';
import { truncateImageTitle } from '../utils/stringUtils.js';
import WorkerPool from '../workers/workerPool';

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
  workerPool: WorkerPool;
  onResize?: (width: number, height: number) => void;
  width: number;
  height: number;
  isCarousel: boolean;
  groupImages: ImageInfo[];
  onImageHover: (data: ImageHoverData) => void;
  onImageLoadError: (imageId: string) => void;
}

// ResponsiveImage component (Refined & Forwarding Ref)
interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  isProcessed: boolean;
  // isLoaded state is managed internally by ResponsiveImage now
  onLoad: () => void;
  onError: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const ResponsiveImage = React.forwardRef<HTMLImageElement, ResponsiveImageProps>(
  ({ src, alt, width, isProcessed, onLoad, onError, className, style }, ref) => {
    const [isInternallyLoaded, setIsInternallyLoaded] = useState(false);

    // Reset loaded state if src changes
    useEffect(() => {
      setIsInternallyLoaded(false);
    }, [src]);

    const handleLoad = useCallback(() => {
      setIsInternallyLoaded(true);
      onLoad(); // Notify parent
    }, [onLoad]);

    const handleError = useCallback(() => {
      setIsInternallyLoaded(false); // Ensure opacity stays 0 on error
      onError(); // Notify parent
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
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute', // Position absolutely to overlay placeholder
          top: 0,
          left: 0,
          ...style,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isInternallyLoaded ? 1 : 0 }} // Use internal loaded state
        transition={{ duration: 0.4, ease: 'easeIn' }}
        onLoad={handleLoad}
        onError={handleError} // Use the internal error handler
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
  workerPool,
  onResize,
  width,
  height,
  isCarousel = false,
  groupImages = [],
  onImageHover,
  onImageLoadError,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // isLoaded now primarily tracks if the HIGH-RES version is ready
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);
  const [processedUrls, setProcessedUrls] = useState<{ low?: string; high?: string }>({});
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);
  const { dominantColors } = useContext(ColorContext);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const processedRequestedRef = useRef(false);
  const [hasError, setHasError] = useState(false);
  const [hasLowResProcessed, setHasLowResProcessed] = useState(false);
  const [hasHighResProcessed, setHasHighResProcessed] = useState(false);

  // Get dominant color for placeholder - Use fallback only
  const placeholderColor = useMemo(() => {
    // Cannot use dominantColors[image.id] as it's likely string[]
    // console.log('Dominant Colors from context:', dominantColors); // Optional: Log to see the actual structure
    return '#333'; // Fallback color
  }, [image.id]); // Remove dominantColors from dependency array

  const targetWidth = containerWidth;
  const targetHeight = containerHeight;

  const aspectRatio = useMemo(() => {
    // Use intrinsic image ratio if available and valid
    if (image.width && image.height && image.width > 0 && image.height > 0) {
      return `${image.width} / ${image.height}`;
    }
    // Fallback based on container dimensions if intrinsic is missing/invalid
    if (targetWidth > 0 && targetHeight > 0) {
      return `${targetWidth} / ${targetHeight}`;
    }
    return '1 / 1'; // Default fallback aspect ratio (square)
  }, [image.width, image.height, targetWidth, targetHeight]);

  // Notify parent of size changes using cached dimensions
  useEffect(() => {
    if (onResize) {
      onResize(targetWidth, targetHeight);
    }
  }, [targetWidth, targetHeight, onResize]);

  // Hover Handlers (Only for Context Update)
  const handleMouseEnter = useCallback(() => {
    if (containerRef.current) {
      // Calculate position and notify parent (for AuraBackground)
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalize position relative to viewport
      const normalizedX = centerX / window.innerWidth;
      const normalizedY = centerY / window.innerHeight;

      // Cannot reliably get specific item color from context if it's just an array
      const itemColor = null;
      onImageHover({
        isHovering: true,
        position: { x: normalizedX, y: normalizedY },
        color: itemColor,
        imageId: image.id,
      });
    }
  }, [onImageHover, image.id]); // Remove dominantColors from dependency array

  const handleMouseLeave = useCallback(() => {
    // Notify parent that hover ended (for AuraBackground)
    console.log('[ImageItem Hover Leave]');
    onImageHover({
      isHovering: false,
      position: null,
      color: null,
      imageId: image.id,
    });
  }, [onImageHover, image.id]);

  // Callback for when the worker sends back processed data
  const handleProcessedImage = useCallback(
    (data: ProcessedImageData) => {
      if (data.id === image.id) {
        setProcessedUrls(prev => ({
          ...prev,
          [data.quality]: data.processedImage,
        }));
        // Track which versions have been processed
        if (data.quality === 'low') {
          setHasLowResProcessed(true);
        }
        if (data.quality === 'high') {
          setHasHighResProcessed(true);
          // Consider high-res loaded once its data URL is received
          // setIsHighResLoaded(true); // Let ResponsiveImage's onLoad handle the final loaded state
        }
      }
    },
    [image.id]
  );

  // Observe when this item enters the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          // Only request processing if intersecting and not already requested *for this item*
          if (!processedRequestedRef.current && targetWidth > 0 && targetHeight > 0) {
            const processor = workerPool.getImageProcessor();
            processor.requestImageProcessing(
              {
                id: image.id,
                src: image.src,
                width: targetWidth,
                height: targetHeight,
              },
              handleProcessedImage
            );
            processedRequestedRef.current = true;
          } else if (processedRequestedRef.current) {
            // console.log(... processing already requested ...);
          } else {
            // console.log(... dimensions invalid ...);
          }
        }
      },
      {
        root: null, // Use the viewport as the root
        rootMargin: '300px', // Trigger when item is 300px away from viewport
        threshold: 0, // Trigger as soon as any part is visible
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [image.id, image.src, workerPool, targetWidth, targetHeight, handleProcessedImage]);

  // --- Effect to Revoke Blob URLs ---
  useEffect(() => {
    // Create local copies of the URLs to revoke in the cleanup function
    // Need to access the state directly inside cleanup for correct values on unmount
    // const lowUrl = processedUrls.low;
    // const highUrl = processedUrls.high;

    // Cleanup function: Revokes the URLs ONLY when the component unmounts
    return () => {
      // Access the latest state values directly from the state variable
      const currentLowUrl = processedUrls.low;
      const currentHighUrl = processedUrls.high;
      if (currentLowUrl) {
        console.log(
          `[ImageItem ${image.id}] Revoking low-res blob URL on unmount: ${currentLowUrl}`
        );
        URL.revokeObjectURL(currentLowUrl);
      }
      if (currentHighUrl) {
        console.log(
          `[ImageItem ${image.id}] Revoking high-res blob URL on unmount: ${currentHighUrl}`
        );
        URL.revokeObjectURL(currentHighUrl);
      }
    };
    // Empty dependency array ensures cleanup runs only on unmount
  }, []); // REMOVED dependencies

  // Determine which src to use
  const currentSrc = useMemo(() => {
    // Prioritize high-res processed if available
    if (processedUrls.high) return processedUrls.high;
    // Fallback to low-res processed if available
    if (processedUrls.low) return processedUrls.low;
    // Otherwise, use the original image src
    return image.src;
  }, [processedUrls.high, processedUrls.low, image.src]);

  // Determine if ANY processed version is being used
  const isUsingProcessed = !!(processedUrls.high || processedUrls.low);

  // Check if we should render the image component at all
  const shouldRenderImage = hasLowResProcessed || hasHighResProcessed || (!hasError && currentSrc);

  // Callback for when the <ResponsiveImage> finishes loading the displayed src
  const handleImageLoad = useCallback(() => {
    // If the high-res processed URL exists OR if we are directly loading the original src
    // and it successfully loads, mark high-res as loaded.
    if (processedUrls.high || (!hasLowResProcessed && !hasHighResProcessed)) {
      setIsHighResLoaded(true);
    }
    setHasError(false); // Clear error state on successful load
  }, [processedUrls.high, hasLowResProcessed, hasHighResProcessed]);

  const handleImageError = useCallback(() => {
    setHasError(true);
    onImageLoadError(image.id); // Notify parent
    // Potentially try fallback or mark as permanently failed?
  }, [image.id, onImageLoadError]);

  // Title for Tooltip
  const truncatedTitle = useMemo(
    () => truncateImageTitle(image.alt || image.title || 'Untitled'),
    [image.alt, image.title]
  );

  // Conditional Rendering based on error
  if (hasError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={styles.imageItemContainer}
      onClick={() => !hasError && onClick(image)} // Prevent click if errored
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
        aspectRatio: aspectRatio,
        position: 'relative', // Needed for absolute positioning of img
        overflow: 'hidden', // Ensure image doesn't overflow container
        cursor: hasError ? 'not-allowed' : 'pointer',
        backgroundColor: placeholderColor, // Use determined placeholder color
      }}
    >
      {/* Placeholder logic removed - background color handles it */}

      {/* Render image only if we have a src and no error, or if low-res is processed */}
      {shouldRenderImage && (
        <ResponsiveImage
          ref={imageRef}
          key={currentSrc} // Change key to force potential re-render/animation on src change
          src={currentSrc}
          alt={image.alt || image.id}
          width={targetWidth} // Pass target width for potential srcSet
          isProcessed={isUsingProcessed}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={styles.imageElement}
        />
      )}

      {/* Display error indicator if needed */}
      {hasError && (
        <div className={styles.errorOverlay}>
          <span>Error</span>
        </div>
      )}

      {/* Simplified Title Overlay */}
      <div className={styles.titleOverlay}>{truncateImageTitle(image.alt || image.id)}</div>

      {/* Add group indicator if needed */}
      {groupCount && groupCount > 1 && <div className={styles.groupIndicator}>{groupCount}</div>}
    </div>
  );
};

export default memo(ImageItem);
