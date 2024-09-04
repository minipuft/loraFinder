import React, { useRef, useEffect, useState } from "react";
import useWindowSize from "../hooks/useWindowSize";
import { ImageInfo } from "@/types";
import ImageItem from "./ImageItem";
import styles from "../styles/ImageRow.module.css";

// Define the props interface for the ImageRow component
interface ImageRowProps {
  images: ImageInfo[];
  onImageClick: (image: ImageInfo) => void;
  columns: number;
  rowHeight: number;
  zoom: number;
  isLastRow: boolean;
  renderImage: (image: ImageInfo) => React.ReactNode;
}

// Define the ImageRow component
const ImageRow: React.FC<ImageRowProps> = ({
  images,
  onImageClick,
  columns,
  rowHeight,
  zoom,
  isLastRow,
  renderImage,
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

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    height: `${rowHeight}px`,
    marginBottom: "4px", // Add some margin between rows
  };

  // Calculate the total aspect ratio of all images in the row
  const totalAspectRatio = images.reduce(
    (sum, img) => sum + img.width / img.height,
    0
  );

  // Calculate the ideal row width
  const idealRowWidth = rowWidth * zoom;

  let imageWidths: number[];

  if (isLastRow && images.length === 1) {
    // For the last row with only one image, set a maximum width
    const maxWidth = idealRowWidth * 0.75; // 75% of the row width
    imageWidths = [Math.min(maxWidth, idealRowWidth)];
  } else {
    // Original width distribution logic
    let remainingWidth = idealRowWidth;
    imageWidths = images.map((image, index) => {
      const aspectRatio = image.width / image.height;
      let width = (aspectRatio / totalAspectRatio) * idealRowWidth;

      // Ensure the last image fills the remaining space
      if (index === images.length - 1) {
        width = remainingWidth;
      } else {
        remainingWidth -= width;
      }

      return Math.floor(width);
    });
  }

  return (
    <div ref={rowRef} className={styles.imageRow}>
      {images.map((image, index) => {
        const containerWidth = imageWidths[index];
        const containerHeight =
          isLastRow && images.length < columns
            ? (containerWidth / image.width) * image.height
            : (containerWidth / image.width) * image.height;

        return (
          <ImageItem
            key={image.id}
            image={image}
            onClick={() => onImageClick(image)}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            zoom={zoom}
          />
        );
      })}
    </div>
  );
};

export default ImageRow;
