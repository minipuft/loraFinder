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
import { workerPool } from '../workers/WorkerPool.js';
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
  const [displayedImages, setDisplayedImages] = useState<ImageInfo[]>(
    images.slice(0, 20)
  );
  const [hasMore, setHasMore] = useState(true);
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
      return images.map((image) => ({
        key: image.id,
        images: [image],
        isCarousel: false,
      }));
    }
    const groups: { [key: string]: ImageInfo[] } = {};
    images.forEach((image) => {
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

  // Calculate rows with grouped images
  const groupedRows = useMemo(() => {
    const rows: ImageInfo[][] = [];
    let currentRow: ImageInfo[] = [];
    let currentAspectRatio = 0;

    groupedImages.forEach((group) => {
      const representativeImage = group.images[0];
      const aspectRatio =
        representativeImage.width / representativeImage.height;

      if (currentAspectRatio + aspectRatio > columns && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentAspectRatio = 0;
      }

      currentRow.push(representativeImage);
      currentAspectRatio += aspectRatio;
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
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

  // Callback function to load more images
  const loadMore = useCallback(() => {
    const newImages = images.slice(
      displayedImages.length,
      displayedImages.length + 20
    );
    setDisplayedImages((prevImages) => [...prevImages, ...newImages]);
    if (displayedImages.length + newImages.length >= images.length) {
      setHasMore(false);
    }
  }, [images, displayedImages]);

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

  // Effect hook to handle scroll events and update row transforms
  useEffect(() => {
    const handleScroll = () => {
      const feed = feedRef.current;
      if (!feed) return;

      const scrollTop = feed.scrollTop;
      const feedHeight = feed.clientHeight;
      const scrollHeight = feed.scrollHeight;

      const newRowTransforms = groupedRows.map((_, index) => {
        const row = feed.querySelector(`.image-row:nth-child(${index + 1})`) as HTMLElement;
        if (!row) return 0;

        const rowTop = row.offsetTop;
        const rowHeight = row.clientHeight;

        const scrollPercentage = (scrollTop - rowTop) / (scrollHeight - feedHeight);
        const transform = scrollPercentage * (feedHeight - rowHeight);

        return transform;
      });

      setRowTransforms(newRowTransforms);
    };

    const feed = feedRef.current;
    if (feed) {
      feed.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (feed) {
        feed.removeEventListener("scroll", handleScroll);
      }
    };
  }, [groupedRows]);

  // Effect hook to handle scroll events and update row transforms with 3D effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const rows = feedRef.current?.querySelectorAll('.image-row');
      
      rows?.forEach((row, index) => {
        const speed = 1 + (index % 3) * 0.1; // Vary speed for each row
        const yOffset = scrollY * speed;
        const rotation = Math.sin(scrollY * 0.002 + index) * 5; // Subtle rotation
        
        row.animate([
          { 
            transform: `translateY(${yOffset}px) rotateX(${rotation}deg) translateZ(${-index * 10}px)`,
          }
        ], {
          duration: 1000,
          fill: "forwards",
          easing: "ease-out",
        });
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect hook to handle scroll events and update row transforms with parallax effect
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.visible);
        } else {
          entry.target.classList.remove(styles.visible);
        }
      });
    }, observerOptions);

    document.querySelectorAll(`.${styles.imageWrapper}`).forEach((img) => {
      observer.observe(img);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    groupedImages.forEach(group => {
      group.images.forEach(image => {
        workerPool.processImage(image).then((processedImage: string) => {
          setProcessedImages(prev => ({
            ...prev,
            [image.id]: { ...prev[image.id], low: processedImage }
          }));
        });
      });
    });
  }, [groupedImages]);

  const imageProcessor = useMemo(() => createImageProcessor(), []);

  return (
    <div className="image-feed overflow-x-hidden" ref={feedRef} style={{ perspective: '1000px' }}>
      <motion.div className={styles.parallaxLayer} style={{ y: y1 }}>
        {/* Add some background elements for parallax effect */}
      </motion.div>
      {groupedRows.map((rowImages, index) => (
        <ImageRow
          key={index}
          images={rowImages}
          onImageClick={handleImageClick}
          columns={columns}
          zoom={zoom}
          isLastRow={index === groupedRows.length - 1}
          rowHeight={200}
          groupedImages={groupedImages}
          processedImages={processedImages}
          workerPool={workerPool}
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
        index={lightboxIndex}
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
