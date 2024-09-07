import React, { useRef, useEffect, useState } from "react";
import useWindowSize from "../hooks/useWindowSize.js";
import { ImageInfo } from "../types.js";
import ImageItem from "./ImageItem.js";
import styles from "../styles/ImageRow.module.scss";
import { motion } from "framer-motion";
import Worker from 'worker-loader';
import { workerPool, WorkerPool } from '../workers/WorkerPool'; // Update this import
import { createImageProcessor } from '../workers/imageProcessor';

// Define the props interface for the ImageRow component
interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo, groupImages: ImageInfo[]) => void;
  columns: number;
  zoom: number;
  isLastRow: boolean;
  rowHeight: number;
  groupedImages: { key: string; images: ImageInfo[]; isCarousel: boolean }[];
  processedImages: { [key: string]: { low: string; high: string } };
  workerPool: WorkerPool;
  imageProcessor: ReturnType<typeof createImageProcessor>;
}

// Define the ImageRow component
const ImageRow: React.FC<ImageRowProps> = ({
  images,
  onImageClick,
  columns,
  zoom,
  isLastRow,
  groupedImages,
  rowHeight,
  imageProcessor,  // Add this line
}) => {
  // Create a ref for the row div and a state for its width
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const { width: windowWidth } = useWindowSize();

  // Effect to update row width when the ref changes
  useEffect(() => {
    if (rowRef.current) {
      setRowWidth(rowRef.current.offsetWidth);
    }
  }, [rowRef.current, windowWidth]);

  // Add a check for images
  if (!images || images.length === 0) {
    return null; // or return a placeholder component
  }

  // Calculate the total aspect ratio of all images in the row
  const totalAspectRatio = images.reduce(
    (sum, img) => sum + img.width / img.height,
    0
  );

  // Calculate the ideal row width
  const idealRowWidth = rowWidth * zoom;

  const imageWidths = images.map((image, index) => {
    const aspectRatio = image.width / image.height;
    return (aspectRatio / totalAspectRatio) * idealRowWidth;
  });

  const containerHeight =
    isLastRow && images.length < columns
      ? (imageWidths[0] / images[0].width) * images[0].height
      : (imageWidths[0] / images[0].width) * images[0].height;

  const rowVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      ref={rowRef}
      className={styles.imageRow}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
    >
      {images.map((image, index) => {
        const group = groupedImages.find(g => g.images.some(img => img.id === image.id));
        const groupCount = group ? group.images.length : 1;

        return (
          <motion.div
            key={image.id}
            className={styles.imageWrapper}
            style={{ 
              width: `${(imageWidths[index] / idealRowWidth) * 100}%`,
              height: containerHeight,
            }}
          >
            <ImageItem
              image={image}
              onClick={() =>
                onImageClick(image, group ? group.images : [image])
              }
              containerWidth={imageWidths[index]}
              containerHeight={containerHeight}
              zoom={zoom}
              groupCount={groupCount}
              imageProcessor={imageProcessor}  // Add this line
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ImageRow;
