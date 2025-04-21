import { motion, useAnimation, Variants } from 'framer-motion';
import React, { useRef } from 'react';
import styles from '../styles/ImageRow.module.scss';
import { ImageInfo } from '../types/index.js';
// import { createImageProcessor } from '../workers/imageProcessor'; // No longer needed directly
import WorkerPool from '../workers/workerPool'; // Import WorkerPool type
import ImageItem, { ImageHoverData } from './ImageItem.js';

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
}

// Define a smoother transition for layout animations using a soft spring
const smoothLayoutTransition = {
  type: 'spring', // Back to spring for a more natural feel
  stiffness: 120, // Lower stiffness for less aggression
  damping: 30, // Higher damping to reduce oscillation
  mass: 1, // Standard mass
  // Removed tween-specific parameters
};

// Define variants for item entrance animation
const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    // Accept custom data (index)
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.03, // Stagger the animation based on index
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

// Define the ImageRow component
const ImageRow: React.FC<ImageRowProps> = ({
  images,
  imageWidths,
  onImageClick,
  columns,
  zoom,
  isLastRow,
  rowHeight,
  groupedImages,
  workerPool,
  gap,
  containerWidth,
  onImageHover,
  onImageLoadError,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  if (
    !images ||
    images.length === 0 ||
    !imageWidths ||
    imageWidths.length !== images.length ||
    rowHeight <= 0
  ) {
    return null;
  }

  return (
    <motion.div
      ref={rowRef}
      className={styles.imageRow}
      animate={controls}
      initial={false}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: `${gap}px`,
        height: `${rowHeight}px`,
        marginBottom: `${gap}px`,
        position: 'relative',
        willChange: 'transform',
        width: '100%',
        maxWidth: `${containerWidth}px`,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}
      layout
      transition={smoothLayoutTransition}
    >
      {images.map((image, index) => {
        const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
        const width = imageWidths[index];

        if (width === undefined || width <= 0) {
          console.warn(
            `Invalid width (${width}) calculated for image ${image.id} at index ${index}`
          );
          return null;
        }

        return (
          <motion.div
            key={image.id}
            className={styles.imageWrapper}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            style={{
              width: `${width}px`,
              height: `${rowHeight}px`,
              flexShrink: 0,
              flexGrow: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
            layout
            transition={smoothLayoutTransition}
          >
            <ImageItem
              image={image}
              onClick={() => onImageClick(image)}
              containerWidth={width}
              containerHeight={rowHeight}
              width={width}
              height={rowHeight}
              zoom={zoom}
              isCarousel={group?.isCarousel || false}
              groupImages={group?.images || []}
              workerPool={workerPool}
              onImageHover={onImageHover}
              onImageLoadError={onImageLoadError}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

// Export the memoized component
export default React.memo(ImageRow);
