import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ImageInfo } from "@/types";
import ImageSkeleton from "./ImageSkeleton";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "../styles/ImageFeed.module.css";
import ImageRow from "./ImageRow";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { truncateImageTitle } from "../utils/stringUtils";

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
  isGrouped: boolean;
  zoom: number;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({ images, isLoading, isGrouped, zoom }) => {
  // State for managing displayed images, pagination, lightbox, and columns
  const [displayedImages, setDisplayedImages] = useState<ImageInfo[]>(
    images.slice(0, 20)
  );
  const [hasMore, setHasMore] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [columns, setColumns] = useState(4);
  const [lightboxImages, setLightboxImages] = useState<ImageInfo[]>([]);

  // Group images by similar titles
  const groupedImages = useMemo(() => {
    if (!isGrouped) {
      return images.map(image => ({ key: image.id, images: [image], isCarousel: false }));
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
      isCarousel: group.length > 1
    }));
  }, [images, isGrouped]);

  // Calculate rows with grouped images
  const groupedRows = useMemo(() => {
    const rows: ImageInfo[][] = [];
    let currentRow: ImageInfo[] = [];
    let currentAspectRatio = 0;

    groupedImages.forEach((group) => {
      const representativeImage = group.images[0];
      const aspectRatio = representativeImage.width / representativeImage.height;
      
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
      const groupIndex = groupedImages.findIndex(group =>
        group.images.some(img => img.id === clickedImage.id)
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

  // Render the image grid
  return (
    <div className={styles.imageGrid}>
      {groupedRows.map((rowImages, rowIndex) => (
        <ImageRow
          key={rowIndex}
          images={rowImages}
          onImageClick={handleImageClick}
          columns={columns}
          zoom={zoom}
          isLastRow={rowIndex === groupedRows.length - 1}
          rowHeight={200}
          groupedImages={groupedImages}
        />
      ))}
      {/* Show loading skeleton when images are being fetched */}
      {isLoading && <ImageSkeleton />}
      {/* Lightbox component for full-screen image viewing */}
      <Lightbox
        slides={lightboxImages.map(image => ({
          src: image.src,
          alt: image.alt,
          title: truncateImageTitle(image.alt),
          description: `Image ${image.id}`,
        }))}
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        plugins={[Captions, Counter, Zoom, ...(lightboxImages.length > 1 ? [Thumbnails] : [])]}
        thumbnails={{
          position: "bottom",
          width: 120,
          height: 80,
          border: 1,
          borderRadius: 4,
          padding: 4,
          gap: 16,
        }}
      />
    </div>
  );
};

export default ImageFeed;
