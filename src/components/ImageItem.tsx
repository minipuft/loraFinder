import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ColorContext } from '../contexts/ColorContext';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types.js';
import AnimationSystem from '../utils/AnimationSystem';
import { truncateImageTitle } from '../utils/stringUtils.js';

// Define hover data payload
export interface ImageHoverData {
  isHovering: boolean;
  position: { x: number; y: number } | null; // Normalized coordinates relative to viewport/background
  color: string | null; // Dominant color of the image, if available
  imageId: string;
}

interface ImageItemProps {
  image: ImageInfo;
  onClick: (image: ImageInfo) => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  groupCount?: number;
  imageProcessor: any;
  onResize?: (width: number, height: number) => void;
  width: number;
  height: number;
  isCarousel: boolean;
  groupImages: ImageInfo[];
  processedImage?: {
    low: string;
    high: string;
  };
  onImageHover: (data: ImageHoverData) => void;
}

// ResponsiveImage component for responsive, performant image loading
interface ResponsiveImageProps {
  src: string;
  alt: string;
  width: number;
  isProcessed: boolean;
  isLoaded: boolean;
  onLoad: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  width,
  isProcessed,
  isLoaded,
  onLoad,
  className,
  style,
}) => {
  // Only use srcSet/sizes for unprocessed images
  const srcSet =
    !isProcessed && width
      ? [
          `${src}&w=${Math.round(width)} 1x`,
          `${src}&w=${Math.round(width * 2)} 2x`,
          `${src}&w=${Math.round(width * 3)} 3x`,
        ].join(', ')
      : undefined;
  const sizes = !isProcessed && width ? `${Math.round(width)}px` : undefined;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
        ...style,
      }}
      onLoad={onLoad}
      srcSet={srcSet}
      sizes={sizes}
    />
  );
};

const ImageItem: React.FC<ImageItemProps> = ({
  image,
  onClick,
  containerWidth,
  containerHeight,
  zoom = 1,
  groupCount,
  imageProcessor,
  onResize,
  width,
  height,
  isCarousel = false,
  groupImages = [],
  processedImage,
  onImageHover,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState(() => processedImage?.low || '');
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);
  const { dominantColors } = useContext(ColorContext);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Use containerWidth/Height directly as they represent the layout calculation
  const targetWidth = containerWidth;
  const targetHeight = containerHeight;

  // Calculate aspect ratio for CSS
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

      // TODO: Get dominant color more reliably (e.g., from processedImage or pass down)
      const itemColor = null; // Placeholder - needs implementation

      console.log('[ImageItem Hover Enter] Normalized Coords:', { x: normalizedX, y: normalizedY });

      onImageHover({
        isHovering: true,
        position: { x: normalizedX, y: normalizedY },
        color: itemColor,
        imageId: image.id,
      });
    }
  }, [onImageHover, image.id, processedImage]);

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

  // Enhanced zoom animation
  useEffect(() => {
    if (!containerRef.current) return;

    const animation = gsap.to(containerRef.current, {
      width: targetWidth,
      height: targetHeight,
      ...animationSystem.getAnimationProperties(image.id),
      onComplete: () => {
        if (containerRef.current) {
          containerRef.current.style.willChange = 'auto';
          animationSystem.createMorphAnimation(containerRef.current, image.id);
        }
      },
    });

    return () => {
      animation.kill();
    };
  }, [targetWidth, targetHeight, zoom, image.id, animationSystem]);

  // Observe when this item enters the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observer.disconnect();
    };
  }, []);

  // Process image when in view or during idle time
  useEffect(() => {
    if (imageProcessor && !processedImage?.high) {
      const messagePayload = {
        action: 'processImage',
        imageSrc: image.src,
        width: Math.ceil(targetWidth),
        height: Math.ceil(targetHeight),
      };

      if (isIntersecting) {
        // If intersecting, process immediately
        imageProcessor.postMessage(messagePayload);
      } else {
        // If not intersecting, schedule processing during idle time
        const idleCallbackId = requestIdleCallback(() => {
          imageProcessor.postMessage(messagePayload);
        });
        return () => cancelIdleCallback(idleCallbackId);
      }
    }
    return undefined;
  }, [isIntersecting, image.src, targetWidth, targetHeight, imageProcessor, processedImage]);

  // Update image source logic - Refined
  useEffect(() => {
    let targetSrc = '';
    if (processedImage?.high) {
      targetSrc = processedImage.high; // Prefer high-res processed if available
    } else if (processedImage?.low) {
      targetSrc = processedImage.low; // Fallback to low-res processed
    } else {
      targetSrc = image.src; // Fallback to original source
    }

    // Only update if the target source is different and valid
    if (targetSrc && targetSrc !== currentImage) {
      // If switching to a new image source, reset loaded state
      setIsLoaded(false);
      setCurrentImage(targetSrc);
      // Note: The <img> onLoad will set isLoaded to true when the new src finishes loading
    } else if (!targetSrc && currentImage !== '') {
      // Handle case where image source becomes invalid/empty
      setIsLoaded(false);
      setCurrentImage('');
    }
  }, [processedImage, image.src, currentImage]); // Add currentImage dependency

  // --- onLoad Handler for the image ---
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.imageContainer} group`}
      style={{
        width: targetWidth,
        aspectRatio: aspectRatio,
        backgroundColor: 'var(--placeholder-bg, #2a2a2a)',
      }}
      onClick={() => onClick(image)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={styles.imageWrapper}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Render image only if src is valid */}
        {currentImage && (
          <ResponsiveImage
            src={currentImage}
            alt={image.alt}
            width={containerWidth}
            isProcessed={!!processedImage}
            isLoaded={isLoaded}
            onLoad={handleImageLoad}
            className={styles.image}
          />
        )}

        <AnimatePresence>
          {groupCount && groupCount > 1 && (
            <motion.div
              className={styles.groupCounter}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {groupCount}
            </motion.div>
          )}
        </AnimatePresence>

        {isCarousel && groupImages.length > 1 && (
          <div className={styles.carouselIndicator}>{groupImages.length}</div>
        )}

        <div
          className={`${styles.imageTitle} opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-5 transition-all duration-200 ease-out`}
        >
          {truncateImageTitle(image.alt)}
        </div>
      </div>
    </div>
  );
};

export default memo(ImageItem);
