import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, Variants } from 'framer-motion';
import React, {
  memo,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import { ColorContext } from '../contexts/ColorContext';
import { ProcessedImageUpdate, useImageProcessing } from '../contexts/ImageProcessingContext';
import styles from '../styles/ImageItem.module.scss';
import { ImageInfo } from '../types/index.js';
import ErrorBoundary from './ErrorBoundary';
import ImageSkeleton from './ImageSkeleton';
import SuspenseImage from './lazy/SuspenseImage';

// --- Local hexToVec3 Definition ---
const hexToVec3 = (hex: string): [number, number, number] => {
  let r = 0,
    g = 0,
    b = 0;
  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
    // 6 digits
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return [r / 255, g / 255, b / 255];
};
// --- End Local Definition ---

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
  onImageLoadError: (imageId: string) => void;
  dominantColor?: string | null;
  complementaryHoverColor?: string | null;
  activeId?: string | null;
  isDropTarget?: boolean;
  dropPosition?: 'before' | 'after' | null;
}

const ImageItem: React.FC<ImageItemProps> = memo(
  ({
    image,
    onClick,
    containerWidth,
    containerHeight,
    width,
    height,
    isCarousel = false,
    onImageLoadError,
    dominantColor,
    complementaryHoverColor,
    activeId,
    isDropTarget = false,
    dropPosition = null,
    zoom,
    groupCount,
  }) => {
    const itemRef = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [processedUrls, setProcessedUrls] = useState<{ [key: string]: string }>({});
    const { subscribeToImageUpdates, publishImageUpdate } = useImageProcessing();
    const pipeline = useAnimationPipeline('image-item');

    const indicatorBeforeRef = useRef<HTMLDivElement>(null);
    const indicatorAfterRef = useRef<HTMLDivElement>(null);

    const { triggerEcho, setHoverState } = useContext(ColorContext);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const handleMouseEnter = useCallback(() => {
      if (activeId !== null) return;
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (!itemRef.current) return;

      const baseHoverColor = dominantColor || '#888888';
      const complementaryHover = complementaryHoverColor || null;

      setHoverState({
        isHovering: true,
        imageId: image.id,
        color: baseHoverColor,
        complementaryColor: complementaryHover,
        position: null,
      });

      pipeline
        .clear()
        .addStep({ target: itemRef.current!, preset: 'itemPassiveHoverStart' })
        .play();

      hoverTimeoutRef.current = setTimeout(() => {
        if (!itemRef.current) return;
        const rect = itemRef.current.getBoundingClientRect();
        const viewportCenterX = rect.left + rect.width / 2;
        const viewportCenterY = rect.top + rect.height / 2;

        const hexColorForEcho = dominantColor || '#888888';
        const colorVec3 = hexToVec3(hexColorForEcho);

        console.log(
          `[ImageItem ${image.id}] Triggering echo at [${viewportCenterX.toFixed(1)}, ${viewportCenterY.toFixed(1)}] with color ${hexColorForEcho}`
        );
        triggerEcho({ center: [viewportCenterX, viewportCenterY], colorVec3 });
      }, 750);
    }, [
      activeId,
      pipeline,
      triggerEcho,
      image.id,
      dominantColor,
      complementaryHoverColor,
      setHoverState,
    ]);

    const handleMouseLeave = useCallback(() => {
      if (activeId !== null) return;

      setHoverState({
        isHovering: false,
        imageId: null,
        color: null,
        complementaryColor: null,
        position: null,
      });

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      pipeline.clear().addStep({ target: itemRef.current!, preset: 'itemPassiveHoverEnd' }).play();
    }, [activeId, pipeline, setHoverState]);

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
      const urlsToRevoke = { ...processedUrls };
      return () => {
        const currentLowUrl = urlsToRevoke.low;
        const currentHighUrl = urlsToRevoke.high;
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
    }, [processedUrls]);

    const imageUrl = useMemo(() => {
      if (processedUrls.high) return processedUrls.high;
      if (processedUrls.low) return processedUrls.low;
      if (image.src && !image.src.startsWith('/') && !image.src.startsWith('http')) {
        return `/api/image/${image.src.replace(/\\/g, '/')}`;
      }
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

    // Ensure the itemRef is passed to the motion.div that has the mouse handlers
    // Combine setNodeRef for sortable with itemRef
    const combinedRef = (node: HTMLDivElement | null) => {
      itemRef.current = node;
      setNodeRef(node);
    };

    const entranceVariants: Variants = {
      initial: { opacity: 0, scale: 0.8, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 20 } },
      exit: { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.15 } },
    };

    return (
      <motion.div
        ref={combinedRef}
        className={itemClassName}
        style={sortableStyle}
        layout
        custom={{ zoom, groupCount }}
        variants={entranceVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...attributes}
        {...listeners}
        data-id={image.id}
        data-testid={`image-item-${image.id}`}
      >
        {/* Drop target indicators */}
        {isDropTarget && dropPosition === 'before' && (
          <motion.div
            ref={indicatorBeforeRef}
            className={`${styles.dropIndicator} ${styles.dropIndicatorBefore}`}
            layoutId={`drop-indicator-before-${image.id}`}
          />
        )}
        <ErrorBoundary fallback={<div>Error</div>}>
          <Suspense
            fallback={
              <ImageSkeleton
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                placeholderColor={placeholderColor}
              />
            }
          >
            <SuspenseImage
              src={imageUrl}
              alt={image.alt || image.title || 'Image'}
              className={styles.imageContent}
              draggable={false} // Prevent native image drag
              onError={handleImageError}
            />
          </Suspense>
        </ErrorBoundary>
        {isDropTarget && dropPosition === 'after' && (
          <motion.div
            ref={indicatorAfterRef}
            className={`${styles.dropIndicator} ${styles.dropIndicatorAfter}`}
            layoutId={`drop-indicator-after-${image.id}`}
          />
        )}
      </motion.div>
    );
  }
);

ImageItem.displayName = 'ImageItem';

export default ImageItem;
