import { motion, useTransform, useViewportScroll } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/plugins/counter.css';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import styles from '../styles/ImageFeed.module.scss';
import { ImageInfo, ViewMode } from '../types.js';
import { truncateImageTitle } from '../utils/stringUtils.js';
import ImageRow from './ImageRow.js';
import ImageSkeleton from './ImageSkeleton.js';
// import Lottie from 'react-lottie';
import { CSSProperties } from 'react';
import { useFolderImages } from '../hooks/query/useFolderImages';
import useWindowSize from '../hooks/useWindowSize.js';
import AnimationSystem from '../utils/AnimationSystem';
import {
  calculateGapSize,
  calculateLayout,
  distributeImages,
  LayoutConfig,
  MIN_IMAGE_WIDTH,
} from '../utils/layoutCalculator';
import WorkerPool from '../workers/workerPool';
import { BannerView, CarouselView, MasonryView } from './views';

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  folderPath: string;
  isGrouped: boolean;
  zoom: number;
  viewMode: ViewMode;
}

interface CustomStyle extends CSSProperties {
  '--energy-color'?: string;
  '--ripple-x'?: string;
  '--ripple-y'?: string;
  '--ripple-strength'?: string;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({ folderPath, isGrouped, zoom, viewMode }) => {
  const {
    data: images,
    isLoading,
    isError,
    error,
    isPlaceholderData,
  } = useFolderImages(folderPath);

  const windowSize = useWindowSize();
  const feedRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(4);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);
  const [rowTransforms, setRowTransforms] = useState<number[]>([]);
  const { scrollY } = useViewportScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 200]);
  const y2 = useTransform(scrollY, [0, 300], [0, -200]);
  const [processedImages, setProcessedImages] = useState<{
    [key: string]: { low: string; high: string };
  }>({});
  const animationSystem = useMemo(() => AnimationSystem.getInstance(), []);

  // Use global worker pool instead of creating new workers
  const imageProcessor = useMemo(() => WorkerPool.getInstance().getImageProcessor(), []);

  // Cleanup worker when component unmounts
  useEffect(() => {
    return () => {
      if (viewMode === ViewMode.GRID) {
        WorkerPool.getInstance().cleanup();
      }
    };
  }, [viewMode]);

  // Reset states when folder or view mode changes
  useEffect(() => {
    setLightboxIndex(-1);
    setLightboxImages([]);
    setProcessedImages({});
    setRowTransforms([]);
  }, [folderPath, viewMode]);

  // Enhanced container width management
  useEffect(() => {
    const updateContainerWidth = () => {
      if (!feedRef.current) return;

      const rect = feedRef.current.getBoundingClientRect();
      // Use the actual measured width from the container
      const newWidth = Math.max(MIN_IMAGE_WIDTH, rect.width);

      if (newWidth !== containerWidth) {
        setContainerWidth(newWidth);
        const config: LayoutConfig = {
          containerWidth: newWidth,
          zoom,
          viewMode,
          isGrouped,
        };
        const layout = calculateLayout(config);
        setColumns(layout.columns);
      }
    };

    updateContainerWidth();

    // Add resize observer for more accurate width updates
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (feedRef.current) {
      resizeObserver.observe(feedRef.current);
    }

    window.addEventListener('resize', updateContainerWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [zoom, viewMode, isGrouped, containerWidth]);

  // Modified groupedImages calculation with better error handling
  const groupedImages = useMemo(() => {
    if (!Array.isArray(images) || images.length === 0) {
      return [];
    }

    const validImages = images.filter(
      image =>
        image &&
        typeof image === 'object' &&
        'width' in image &&
        'height' in image &&
        image.width > 0 &&
        image.height > 0
    );

    if (!isGrouped) {
      return validImages.map(image => ({
        key: image.id,
        images: [image],
        isCarousel: false,
      }));
    }

    const groups: { [key: string]: ImageInfo[] } = {};
    validImages.forEach(image => {
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

  // Enhanced groupedRows calculation with better error handling and viewMode awareness
  const groupedRows = useMemo(() => {
    if (!containerWidth || groupedImages.length === 0 || viewMode !== ViewMode.GRID) return [];

    const firstImages = groupedImages
      .map(group => group.images[0])
      .filter(image => image && image.width > 0 && image.height > 0);

    if (firstImages.length === 0) return [];

    // Uses our optimized distributeImages function with sorted cache
    return distributeImages(firstImages, containerWidth, zoom, 200 /* base row height */);
  }, [groupedImages, zoom, containerWidth, viewMode]);

  // Handle image overflow
  const handleImageOverflow = useCallback((image: ImageInfo) => {
    console.warn('Image overflow detected:', image.id);
    // Implement any necessary overflow handling logic here
  }, []);

  // Update handleImageClick to work with grouped images and set lightbox plugins
  const handleImageClick = useCallback(
    (clickedImage: ImageInfo) => {
      // Find the group the clicked image belongs to
      const groupIndex = groupedImages.findIndex(group =>
        group.images.some(img => img.id === clickedImage.id)
      );

      if (groupIndex !== -1) {
        const group = groupedImages[groupIndex];
        // Find the index of the clicked image WITHIN that group
        const imageIndexInGroup = group.images.findIndex(img => img.id === clickedImage.id);

        if (imageIndexInGroup !== -1) {
          setLightboxImages(group.images); // Set the images for the lightbox
          setLightboxIndex(imageIndexInGroup); // Set the index WITHIN the group
        }
      }
    },
    [groupedImages] // Dependency remains the same
  );

  // Callback function to get the correct image URL
  const getImageUrl = useCallback((imagePath: string) => {
    // 1. Replace backslashes with forward slashes
    let path = imagePath.replace(/\\/g, '/');
    // 2. Check if it already starts with '/api/image/' or just '/'. If so, use it directly.
    if (path.startsWith('/api/image/') || path.startsWith('/')) {
      // Assume it's already a usable path
      return path;
    }
    // 3. Otherwise, prepend the API prefix
    return `/api/image/${path}`;
  }, []);

  // Enhanced renderContent
  const renderContent = () => {
    if (!containerWidth) return null;
    const currentImages = images ?? [];
    const gap = calculateGapSize(zoom);

    switch (viewMode) {
      case ViewMode.MASONRY:
        return <MasonryView images={currentImages} zoom={zoom} />;
      case ViewMode.BANNER:
        return <BannerView images={currentImages} zoom={zoom} />;
      case ViewMode.CAROUSEL:
        return <CarouselView images={currentImages} zoom={zoom} />;
      case ViewMode.GRID:
      default:
        if (!groupedRows.length) return null;
        return (
          <div className={styles.gridContainer} style={{ gap }}>
            {groupedRows.map((row, rowIndex) => (
              <ImageRow
                key={`row-${rowIndex}`}
                images={row.images}
                onImageClick={handleImageClick}
                columns={columns}
                zoom={zoom}
                isLastRow={rowIndex === groupedRows.length - 1}
                rowHeight={row.height}
                groupedImages={groupedImages}
                processedImages={processedImages}
                imageProcessor={imageProcessor}
                gap={gap}
                containerWidth={containerWidth}
                onImageOverflow={handleImageOverflow}
              />
            ))}
            {isPlaceholderData && <div className={styles.placeholderLoading}>Updating...</div>}
          </div>
        );
    }
  };

  // Lightbox configuration
  const lightboxPlugins = useMemo(() => [Captions, Counter, Thumbnails, Zoom], []);

  // Prepare the lightbox slide objects
  const slides = useMemo(() => {
    if (!lightboxImages.length) return [];
    return lightboxImages.map(image => ({
      src: getImageUrl(image.src),
      alt: image.alt,
      title: image.title,
      width: image.width,
      height: image.height,
    }));
  }, [lightboxImages, getImageUrl]);

  // Handle Error State
  if (isError) {
    return (
      <div ref={feedRef} className={`${styles.container} ${styles.error}`}>
        Error loading images: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Handle Loading State (show skeletons only on initial load)
  if (isLoading && !isPlaceholderData) {
    return (
      <div ref={feedRef} className={styles.container}>
        <div className={`${styles.feed} ${styles.loading}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ImageSkeleton key={i} containerWidth={200} containerHeight={150} />
          ))}
        </div>
      </div>
    );
  }

  // Handle Empty State (after loading and no errors)
  if (!images || images.length === 0) {
    return (
      <div ref={feedRef} className={styles.container}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.noImages}>
          No images found for this folder.
        </motion.div>
      </div>
    );
  }

  // Main Render
  return (
    <div
      ref={feedRef}
      className={styles.container}
      style={{
        position: 'relative',
      }}
    >
      <div className={styles.feed}>{renderContent()}</div>

      <Lightbox
        open={lightboxIndex !== -1}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
        plugins={lightboxPlugins}
      />
    </div>
  );
};

export default React.memo(ImageFeed);
