import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ImageInfo } from "../types.js";
import ImageSkeleton from "./ImageSkeleton.js";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "../styles/ImageFeed.module.scss";
import ImageRow from "./ImageRow.js";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { truncateImageTitle } from "../utils/stringUtils.js";
import { motion, useViewportScroll, useTransform } from 'framer-motion';
// import Lottie from 'react-lottie';
import { createImageProcessor } from '../workers/imageProcessor.js';

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
  isGrouped: boolean;
  zoom: number;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({
  images,
  isLoading,
  isGrouped,
  zoom,
}) => {
  // State for managing displayed images, pagination, lightbox, and columns
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [columns, setColumns] = useState(4);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);
  const [rowTransforms, setRowTransforms] = useState<number[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useViewportScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 200]);
  const y2 = useTransform(scrollY, [0, 300], [0, -200]);
  const [processedImages, setProcessedImages] = useState<{ [key: string]: { low: string; high: string } }>({});

  // Group images by similar titles
  const groupedImages = useMemo(() => {
    if (!isGrouped) {
      return images
        .filter(image => image && image.width && image.height)
        .map((image) => ({
          key: image.id,
          images: [image],
          isCarousel: false,
        }));
    }
    const groups: { [key: string]: ImageInfo[] } = {};
    images
      .filter(image => image && image.width && image.height)
      .forEach((image) => {
        const processedTitle = truncateImageTitle(image.alt);
        if (!groups[processedTitle]) {
          groups[processedTitle] = [];
        }
        groups[processedTitle].push(image);
      });
    return Object.entries(groups).map(([key, group]) => ({
      key,
      images: group,
      isCarousel: group.length > 1,
    }));
  }, [images, isGrouped]);

  // Modified groupedRows calculation
  const groupedRows = useMemo(() => {
    const rows: ImageInfo[][] = [];
    const targetAspectRatio = columns * 0.75;
    const minImagesPerRow = Math.max(1, Math.floor(columns / 2));
    let currentRow: ImageInfo[] = [];
    let currentAspectRatio = 0;

    // Cache aspect ratios for quick lookup
    const aspectRatioCache = new Map();
    
    const getAspectRatio = (image: ImageInfo) => {
      if (!aspectRatioCache.has(image.id)) {
        aspectRatioCache.set(image.id, image.width / image.height);
      }
      return aspectRatioCache.get(image.id);
    };

    const pushCurrentRow = () => {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentAspectRatio = 0;
      }
    };

    for (let i = 0; i < groupedImages.length; i++) {
      const group = groupedImages[i];
      const image = group.images[0];
      const aspectRatio = getAspectRatio(image);

      if (
        (currentAspectRatio + aspectRatio > targetAspectRatio && 
         currentRow.length >= minImagesPerRow) ||
        currentRow.length >= columns
      ) {
        pushCurrentRow();
      }

      currentRow = [...currentRow, image];
      currentAspectRatio += aspectRatio;

      if (i === groupedImages.length - 1) {
        pushCurrentRow();
      }
    }

    return rows;
  }, [groupedImages, columns]);

  // Update handleImageClick to work with grouped images and set lightbox plugins
  const handleImageClick = useCallback(
    (clickedImage: ImageInfo) => {
      const groupIndex = groupedImages.findIndex((group) =>
        group.images.some((img) => img.id === clickedImage.id)
      );
      if (groupIndex !== -1) {
        const group = groupedImages[groupIndex];
        setLightboxIndex(groupIndex);
        setLightboxImages(group.images);
      }
    },
    [groupedImages]
  );

  // Callback function to get the correct image URL
  const getImageUrl = useCallback((imagePath: string) => {
    const cleanPath = imagePath
      .replace(/^(\/|api\/image\/)+/, "")
      .replace(/\\/g, "/");
    return `/api/image/${cleanPath}`;
  }, []);

  // Function to calculate the number of columns based on container width
  const calculateColumns = (containerWidth: number) => {
    if (containerWidth >= 2560) return 7;
    if (containerWidth >= 1920) return 6;
    if (containerWidth >= 1440) return 5;
    if (containerWidth >= 1200) return 4;
    if (containerWidth >= 992) return 3;
    if (containerWidth >= 576) return 2;
    return 1;
  };

  // Effect hook to handle window resize and update columns
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newColumns = calculateColumns(width);
      setColumns(newColumns);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect hook to handle scroll events and update row transforms with 3D effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const rows = feedRef.current?.querySelectorAll('.image-row');
      
      rows?.forEach((row, index) => {
        // Only apply transforms if the row is in view
        const rect = row.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInView) {
          const speed = 1 + (index % 3) * 0.1;
          const yOffset = scrollY * speed;
          const rotation = Math.sin(scrollY * 0.002 + index) * 5;
          
          row.animate([
            { 
              transform: `translateY(${yOffset}px) rotateX(${rotation}deg) translateZ(${-index * 10}px)`,
              opacity: 1
            }
          ], {
            duration: 1000,
            fill: "forwards",
            easing: "ease-out",
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const imageProcessor = useMemo(() => createImageProcessor(), []);

  return (
    <div className="image-feed overflow-x-hidden" ref={feedRef} style={{ perspective: '1000px' }}>
      <motion.div className={styles.parallaxLayer} style={{ y: y1 }}>
        {/* Add some background elements for parallax effect */}
      </motion.div>
      
      {groupedRows.map((rowImages, index) => (
        <ImageRow
          key={`row-${index}-${rowImages.map(img => img.id).join('-')}`} // Improved key
          images={rowImages}
          onImageClick={handleImageClick}
          columns={columns}
          zoom={zoom}
          isLastRow={index === groupedRows.length - 1}
          rowHeight={200}
          groupedImages={groupedImages}
          processedImages={processedImages}
          imageProcessor={imageProcessor}
        />
      ))}

      {isLoading && <ImageSkeleton containerWidth={800} containerHeight={600} />}
      
      <Lightbox
        slides={lightboxImages.map((image) => ({
          src: image.src,
          alt: image.alt,
          title: truncateImageTitle(image.alt),
          description: `Image ${image.id}`,
        }))}
        open={lightboxIndex >= 0}
        index={lightboxIndex-(lightboxIndex)}
        close={() => setLightboxIndex(-1)}
        plugins={[
          Captions,
          Counter,
          Zoom,
          ...(lightboxImages.length > 1 ? [Thumbnails] : []),
        ]}
        thumbnails={{
          position: "bottom",
          width: 120,
          height: 80,
          border: 1,
          borderRadius: 4,
          padding: 4,
          gap: 16,
        }}
        animation={{
          fade: 300,
          swipe: 300,
        }}
        carousel={{
          finite: true,
          preload: 2,
        }}
      />
      
      <motion.div className={styles.parallaxLayer} style={{ y: y2 }}>
        {/* Add some foreground elements for parallax effect */}
      </motion.div>
    </div>
  );
};

export default ImageFeed;
