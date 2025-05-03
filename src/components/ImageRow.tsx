import React, { useRef } from 'react';
import styles from '../styles/ImageRow.module.scss';
import { ImageInfo } from '../types/index.js';
// import { createImageProcessor } from '../workers/imageProcessor'; // No longer needed directly
import { AnimatePresence, motion, Variants } from 'framer-motion';
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
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { activeId, potentialDropTarget } = useDragContext();

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
  const containsActiveItem = activeId ? images.some(img => img.id === activeId) : false;
  const containsDropTarget = potentialDropTarget
    ? images.some(img => img.id === potentialDropTarget.targetId)
    : false;
  const rowClassName = `${styles.imageRow} ${
    containsActiveItem ? styles.sourceRow : ''
  } ${containsDropTarget ? styles.targetRow : ''}`;

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
      <AnimatePresence initial={false} mode="sync" onExitComplete={onExitComplete}>
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
              ease: 'power2.inOut',
              delay: index * 0.02,
            },
          };

          // Use context values to determine drop target state for the specific item
          const isDropTarget = potentialDropTarget?.targetId === image.id;
          const dropPosition = isDropTarget ? potentialDropTarget.position : null;

          const itemAnimationState = isDropTarget ? 'highlighted' : 'normal';
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
                  activeId={activeId as string | null}
                  isDropTarget={isDropTarget}
                  dropPosition={dropPosition}
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
