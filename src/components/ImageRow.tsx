import React, { useRef, useEffect, useState, useMemo } from 'react';
import useWindowSize from '../hooks/useWindowSize.js';
import { ImageInfo } from '../types.js';
import ImageItem from './ImageItem.js';
import styles from '../styles/ImageRow.module.scss';
import { motion, useAnimation } from 'framer-motion';
import { createImageProcessor } from '../workers/imageProcessor';
import gsap from 'gsap';
import { calculateImageDimensions, optimizeRowLayout } from '../utils/layoutCalculator';

// Define the props interface for the ImageRow component
interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (clickedImage: ImageInfo) => void;
  columns: number;
  zoom: number;
  isLastRow: boolean;
  rowHeight: number;
  groupedImages: { key: string; images: ImageInfo[]; isCarousel: boolean }[];
  processedImages: { [key: string]: { low: string; high: string } };
  imageProcessor: ReturnType<typeof createImageProcessor>;
  onImageOverflow?: (image: ImageInfo) => void;
  gap: number;
  containerWidth: number;
}

// Define the ImageRow component
const ImageRow: React.FC<ImageRowProps> = ({
  images,
  onImageClick,
  columns,
  zoom,
  isLastRow,
  rowHeight,
  groupedImages,
  processedImages,
  imageProcessor,
  onImageOverflow,
  gap,
  containerWidth,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [imageStates, setImageStates] = useState<Map<string, { width: number; height: number }>>(
    new Map()
  );
  const controls = useAnimation();
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Reset image states when images or groups change
  useEffect(() => {
    setImageStates(new Map());
    setIsOverflowing(false);
  }, [images, groupedImages]);

  const optimizedLayout = useMemo(() => {
    if (!images.length) return null;

    const validImages = images.every(img => img.width > 0 && img.height > 0);
    if (!validImages) return null;

    // Uses cached layout calculations
    return optimizeRowLayout(
      {
        width: containerWidth,
        height: rowHeight,
        gap,
        images,
      },
      containerWidth,
      zoom
    );
  }, [containerWidth, rowHeight, gap, images.length, zoom]);

  // Enhanced image width calculation with overflow detection
  const imageWidths = useMemo(() => {
    if (!optimizedLayout) return [];

    const totalGapWidth = gap * (images.length - 1);
    const availableWidth = Math.max(0, containerWidth - totalGapWidth);

    // Calculate aspect ratios once
    const aspectRatios = images.map(image => image.width / image.height);
    const totalAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0);

    // First pass: calculate proportional widths
    const widths = aspectRatios.map(ratio => {
      const proportion = ratio / totalAspectRatio;
      return Math.floor(availableWidth * proportion);
    });

    // Check if total width exceeds container width
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + totalGapWidth;
    const newIsOverflowing = totalWidth > containerWidth;

    if (newIsOverflowing !== isOverflowing) {
      setIsOverflowing(newIsOverflowing);
      if (newIsOverflowing && onImageOverflow) {
        onImageOverflow(images[images.length - 1]);
      }
    }

    // Second pass: adjust widths to fit container exactly
    if (newIsOverflowing || totalWidth < containerWidth) {
      const remainingWidth = containerWidth - totalWidth;
      const adjustmentPerImage = Math.floor(remainingWidth / images.length);

      return widths.map((width, index) => {
        // Add any remaining pixels to the last image
        if (index === widths.length - 1) {
          const usedWidth =
            widths.slice(0, -1).reduce((sum, w) => sum + w + adjustmentPerImage, 0) + totalGapWidth;
          return Math.max(0, containerWidth - usedWidth);
        }
        return Math.max(0, width + adjustmentPerImage);
      });
    }

    return widths;
  }, [images, containerWidth, gap, optimizedLayout, isOverflowing, onImageOverflow]);

  // Handle image resize with debouncing
  const createHandleImageResize = (imageId: string) => (width: number, height: number) => {
    setImageStates((prev: Map<string, { width: number; height: number }>) => {
      const newMap = new Map(prev);
      newMap.set(imageId, { width, height });
      return newMap;
    });
  };

  if (!images || images.length === 0 || !optimizedLayout) {
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
        gap: `${gap}px`,
        height: `${optimizedLayout.height}px`,
        marginBottom: `${gap}px`,
        position: 'relative',
        willChange: 'transform',
        width: '100%',
        maxWidth: `${containerWidth}px`,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
      }}
      layout
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {images.map((image, index) => {
        const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
        const width = imageWidths[index];

        if (!width) return null;

        return (
          <motion.div
            key={image.id}
            className={styles.imageWrapper}
            style={{
              width: `${width}px`,
              height: `${optimizedLayout.height}px`,
              flexShrink: 0,
              flexGrow: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
            layout
          >
            <ImageItem
              image={image}
              onClick={() => onImageClick(image)}
              containerWidth={width}
              containerHeight={optimizedLayout.height}
              width={width}
              height={optimizedLayout.height}
              zoom={zoom}
              isCarousel={group?.isCarousel || false}
              groupImages={group?.images || []}
              processedImage={processedImages[image.id]}
              imageProcessor={imageProcessor}
              onResize={createHandleImageResize(image.id)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ImageRow;
