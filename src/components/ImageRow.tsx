import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/ImageRow.module.scss';
import { ImageInfo } from '../types/index.js';
// import { createImageProcessor } from '../workers/imageProcessor'; // No longer needed directly
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { useAnimationPipeline } from '../animations/AnimationManager'; // Import the hook
import { useDragContext } from '../contexts/DragContext';
import WorkerPool from '../workers/workerPool'; // Import WorkerPool type
import ImageItem, { ImageHoverData } from './ImageItem.js';

// Type for layout data passed down
interface LayoutData {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Define the props interface for the ImageRow component
interface ImageRowProps {
  images: ImageInfo[];
  imageWidths: number[];
  onImageClick: (clickedImage: ImageInfo) => void;
  columns: number;
  zoom: number;
  isLastRow: boolean;
  rowHeight: number;
  groupedImages: { key: string; images: ImageInfo[]; isCarousel: boolean }[];
  workerPool: WorkerPool;
  gap: number;
  containerWidth: number;
  onImageHover: (data: ImageHoverData) => void;
  onImageLoadError: (imageId: string) => void;
  dominantColorMap?: Map<string, string>; // Added optional prop for colors
  initialAnimateState: 'initial' | 'animate'; // State for entrance animation
  feedCenter: { x: number; y: number }; // Center coords of the parent feed
  layoutDataMap: Map<string, LayoutData>; // <-- Add layoutDataMap prop
  /** Called when the exit animation completes for grouping transitions */
  onExitComplete?: () => void;
  rowIndex: number; // <-- Add rowIndex prop
}

// Define a smoother transition for layout animations using a soft spring
const smoothLayoutTransition = {
  type: 'spring', // Back to spring for a more natural feel
  stiffness: 120, // Lower stiffness for less aggression
  damping: 30, // Higher damping to reduce oscillation
  mass: 1, // Standard mass
};

// Define the ImageRow component
const ImageRow: React.FC<ImageRowProps> = ({
  images,
  imageWidths,
  onImageClick,
  rowHeight,
  gap,
  layoutDataMap,
  groupedImages,
  workerPool,
  zoom,
  onImageHover,
  onImageLoadError,
  dominantColorMap,
  feedCenter,
  initialAnimateState,
  onExitComplete,
  isLastRow,
  containerWidth,
  rowIndex, // <-- Destructure rowIndex
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { activeId, itemDropTarget, hoveredRowIndex } = useDragContext();

  // Get scoped pipeline using the hook
  const pipeline = useAnimationPipeline(`row-${rowIndex}`);

  // Remove local state for pipeline
  // const pipelineRef = useRef<AnimationPipeline | null>(null);
  const [isHoverTarget, setIsHoverTarget] = useState(false);
  const [isDragSource, setIsDragSource] = useState(false);

  // Remove pipeline initialization useEffect
  /*
  useEffect(() => {
    if (rowRef.current) {
      pipelineRef.current = new AnimationPipeline(); // Initialize on mount
    }
    return () => {
      pipelineRef.current?.kill(); // Clean up on unmount (Manager handles this now)
    };
  }, []);
  */

  // Effect to handle row hover state changes (use `pipeline` directly)
  useEffect(() => {
    const isCurrentlyHoverTarget = hoveredRowIndex === rowIndex;
    if (isCurrentlyHoverTarget !== isHoverTarget) {
      setIsHoverTarget(isCurrentlyHoverTarget);
      if (isCurrentlyHoverTarget) {
        console.log(`[ImageRow ${rowIndex}] Hover Enter - Target Row`);
        pipeline // Use the hook's pipeline instance
          .clear()
          .addStep({ target: rowRef.current!, preset: 'rowHoverEnter' })
          .play();
      } else {
        console.log(`[ImageRow ${rowIndex}] Hover Leave - Target Row`);
        pipeline // Use the hook's pipeline instance
          .clear()
          .addStep({ target: rowRef.current!, preset: 'rowHoverLeave' })
          .play();
      }
    }
  }, [hoveredRowIndex, rowIndex, isHoverTarget, pipeline]); // Add pipeline to dependencies

  // Effect to handle when the row contains the actively dragged item (use `pipeline` directly)
  useEffect(() => {
    const containsActive = activeId ? images.some(img => img.id === activeId) : false;
    if (containsActive !== isDragSource) {
      setIsDragSource(containsActive);
      if (containsActive) {
        console.log(`[ImageRow ${rowIndex}] Drag Source Active`);
        pipeline // Use the hook's pipeline instance
          .clear()
          .addStep({ target: rowRef.current!, preset: 'rowDragSourceActive' })
          .play();
      } else {
        if (!isHoverTarget) {
          console.log(`[ImageRow ${rowIndex}] Drag Source Inactive`);
          pipeline // Use the hook's pipeline instance
            .clear()
            .addStep({ target: rowRef.current!, preset: 'rowHoverLeave' })
            .play();
        }
      }
    }
  }, [activeId, images, rowIndex, isDragSource, isHoverTarget, pipeline]); // Add pipeline to dependencies

  if (
    !images ||
    images.length === 0 ||
    !imageWidths ||
    imageWidths.length !== images.length ||
    rowHeight <= 0 ||
    !layoutDataMap
  ) {
    return null;
  }

  // Use context values for highlighting
  // const containsActiveItem = activeId ? images.some(img => img.id === activeId) : false; // Handled by useEffect
  // const containsDropTarget = itemDropTarget // Use itemDropTarget now
  //   ? images.some(img => img.id === itemDropTarget?.targetId)
  //   : false;
  // const rowClassName = `${styles.imageRow} ${
  //   containsActiveItem ? styles.sourceRow : ''
  // } ${containsDropTarget ? styles.targetRow : ''}`;

  // Use base class name, animations will handle visual state
  const rowClassName = styles.imageRow;

  return (
    <motion.div
      ref={rowRef}
      className={rowClassName}
      layout
      transition={smoothLayoutTransition}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: `${gap}px`,
        height: `${rowHeight}px`,
        marginBottom: isLastRow ? '0' : `${gap}px`,
        position: 'relative',
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}
    >
      <AnimatePresence initial={false} mode="popLayout" onExitComplete={onExitComplete}>
        {images.map((image, index) => {
          const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
          const width = imageWidths[index];
          const layoutData = layoutDataMap.get(image.id);

          if (width === undefined || width <= 0 || !layoutData) {
            console.warn(
              `Invalid width (${width}) or missing layoutData for image ${image.id}`,
              layoutData
            );
            return null;
          }

          const dominantColor = dominantColorMap?.get(image.id);

          const initialOffsetX = feedCenter.x - (layoutData.left + layoutData.width / 2);
          const initialOffsetY = feedCenter.y - (layoutData.top + layoutData.height / 2);

          const entranceVariants: Variants = {
            initial: {
              opacity: 0,
              scale: 0.6,
              x: initialOffsetX,
              y: initialOffsetY,
              rotate: (Math.random() - 0.5) * 30,
            },
            animate: {
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              rotate: 0,
              transition: {
                type: 'spring',
                stiffness: 100,
                damping: 20,
                delay: index * 0.04,
              },
            },
          };

          const exitOffsetX = feedCenter.x - (layoutData.left + layoutData.width / 2);
          const exitOffsetY = feedCenter.y - (layoutData.top + layoutData.height / 2);

          const exitVariant = {
            opacity: 0,
            scale: 0.6,
            x: exitOffsetX,
            y: exitOffsetY,
            rotate: (Math.random() - 0.5) * 15,
            transition: {
              duration: 0.4,
              ease: 'easeInOut',
              delay: index * 0.02,
            },
          };

          // Use context values to determine drop target state for the specific item
          const isDropTargetForItem =
            itemDropTarget?.targetId === image.id && hoveredRowIndex === rowIndex;
          const dropPositionForItem = isDropTargetForItem
            ? (itemDropTarget?.position ?? null)
            : null;

          const itemAnimationState = isDragSource ? 'highlighted' : 'normal';
          const dragInteractionVariants: Variants = {
            normal: {
              scale: 1,
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 25,
              },
            },
            highlighted: {
              scale: 1.02,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: {
                type: 'spring',
                stiffness: 400,
                damping: 20,
              },
            },
          };

          // Cast activeId to string | null for ImageItem prop compatibility
          const activeItemIdAsString: string | null =
            typeof activeId === 'string' ? activeId : null;

          return (
            <motion.div
              key={image.id}
              className={`${styles.imageWrapper} card`}
              layout
              transition={smoothLayoutTransition}
              variants={entranceVariants}
              initial="initial"
              animate={initialAnimateState}
              exit={exitVariant}
              style={{
                width: `${width}px`,
                height: `${rowHeight}px`,
                flexShrink: 0,
                flexGrow: 0,
                position: 'relative',
                overflow: 'hidden',
                willChange: 'transform, opacity',
              }}
            >
              <motion.div
                variants={dragInteractionVariants}
                animate={itemAnimationState}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <ImageItem
                  image={image}
                  onClick={() => onImageClick(image)}
                  containerWidth={width}
                  containerHeight={rowHeight}
                  zoom={zoom}
                  isCarousel={group?.isCarousel || false}
                  groupImages={group?.images || []}
                  width={width}
                  height={rowHeight}
                  onImageHover={onImageHover}
                  onImageLoadError={onImageLoadError}
                  dominantColor={dominantColor}
                  activeId={activeItemIdAsString}
                  isDropTarget={isDropTargetForItem}
                  dropPosition={dropPositionForItem}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

// Export the memoized component
export default React.memo(ImageRow);
