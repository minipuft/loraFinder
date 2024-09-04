import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ImageInfo } from "@/types";
import ImageSkeleton from "./ImageSkeleton";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import styles from "../styles/ImageFeed.module.css";
import ImageRow from "./ImageRow";
import { groupImagesByName } from "../utils/imageUtils";

// Define the props interface for ImageFeed component
interface ImageFeedProps {
  images: ImageInfo[];
  isLoading: boolean;
}

// Define the ImageFeed component
const ImageFeed: React.FC<ImageFeedProps> = ({ images, isLoading }) => {
  // State for managing displayed images, pagination, lightbox, columns, and zoom
  const [displayedImages, setDisplayedImages] = useState<ImageInfo[]>(
    images.slice(0, 20)
  );
  const [hasMore, setHasMore] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [columns, setColumns] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [groupedImages, setGroupedImages] = useState<{
    [key: string]: ImageInfo[];
  }>({});
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);

  // Callback function to handle image click and open lightbox
  const handleImageClick = useCallback(
    (image: ImageInfo) => {
      const groupName = Object.keys(groupedImages).find((key) =>
        groupedImages[key].some((img) => img.id === image.id)
      );
      if (groupName) {
        setCurrentGroup(groupName);
        const index = groupedImages[groupName].findIndex(
          (img) => img.id === image.id
        );
        setLightboxIndex(index);
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

  // TODO: fix on-click image modal not selecting the correct image

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

  // Effect hook to handle zoom changes
  useEffect(() => {
    // Function to update zoom state when a custom 'zoomChange' event is fired
    const handleZoomChange = (event: CustomEvent) => {
      setZoom(event.detail);
    };

    // Add event listener for 'zoomChange' event
    window.addEventListener("zoomChange", handleZoomChange as EventListener);
    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener(
        "zoomChange",
        handleZoomChange as EventListener
      );
    };
  }, []);

  // Memoized calculation of image rows for efficient rendering
  const imageRows = useMemo(() => {
    const rows: ImageInfo[][] = [];
    let currentRow: ImageInfo[] = [];
    let currentAspectRatio = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const aspectRatio = image.width / image.height;

      if (currentAspectRatio + aspectRatio > columns && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentAspectRatio = 0;
      }

      currentRow.push(image);
      currentAspectRatio += aspectRatio;

      if (i === images.length - 1) {
        rows.push(currentRow);
      }
    }

    return rows;
  }, [images, columns]);

  // Effect hook to handle grouped images
  useEffect(() => {
    const grouped = groupImagesByName(images);
    setGroupedImages(grouped);
  }, [images]);

  // Render the image grid
  return (
    <div className={styles.imageGrid}>
      {/* Map through grouped images and render each row */}
      {imageRows.map((rowImages, rowIndex) => (
        <ImageRow
          key={rowIndex}
          images={rowImages}
          onImageClick={handleImageClick}
          columns={columns}
          zoom={zoom}
          isLastRow={rowIndex === imageRows.length - 1}
          rowHeight={200} // Add a fixed row height or calculate dynamically
        />
      ))}
      {/* Show loading skeleton when images are being fetched */}
      {isLoading && <ImageSkeleton />}
      {/* Lightbox component for full-screen image viewing */}
      <Lightbox
        slides={
          currentGroup
            ? groupedImages[currentGroup].map((img) => ({
                src: getImageUrl(img.src),
                alt: img.alt,
              }))
            : []
        }
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => {
          setLightboxIndex(-1);
          setCurrentGroup(null);
        }}
      />
    </div>
  );
};

export default ImageFeed;
