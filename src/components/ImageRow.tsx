import { motion, useAnimation } from 'framer-motion';
import React, { memo, useRef } from 'react';
import styles from '../styles/ImageRow.module.scss';
import { ImageInfo } from '../types.js';
import { createImageProcessor } from '../workers/imageProcessor';
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
  processedImages: { [key: string]: { low: string; high: string } };
  imageProcessor: ReturnType<typeof createImageProcessor>;
  gap: number;
  containerWidth: number;
  onImageHover: (data: ImageHoverData) => void;
}

// Define a smoother spring transition for layout animations
const smoothLayoutTransition = {
  type: 'spring',
  stiffness: 200, // Lower stiffness for less aggression
  damping: 25, // Adjust damping for smoothness
  mass: 0.8, // Adjust mass if needed
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
  processedImages,
  imageProcessor,
  gap,
  containerWidth,
  onImageHover,
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
              processedImage={processedImages[image.id]}
              imageProcessor={imageProcessor}
              onImageHover={onImageHover}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

// WRAP EXPORT IN React.memo
export default memo(ImageRow);
