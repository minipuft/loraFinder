import React from "react";
import Image from "next/image";
import { ImageInfo } from "@/types";
import styles from "../styles/ImageItem.module.css";
import { truncateImageTitle } from "../utils/stringUtils";

// Define the props interface for the ImageItem component
interface ImageItemProps {
  image: ImageInfo;
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
}

// Define the ImageItem component using React.memo for performance optimization
const ImageItem: React.FC<ImageItemProps> = React.memo(
  ({ image, onClick, containerWidth, containerHeight, zoom }) => {
    const scaledWidth = containerWidth * zoom;
    const scaledHeight = containerHeight * zoom;

    return (
      // Wrapper div for the image with dynamic styling
      <div
        className={`${styles.imageWrapper} ${styles.smoothTransition}`}
        style={{ width: scaledWidth, height: scaledHeight }}
        onClick={onClick}
      >
        {/* Next.js Image component for optimized image loading */}
        <Image
          src={image.src}
          alt={image.alt}
          layout="fill"
          objectFit="cover"
          className={styles.image}
        />
        {/* Container for the image title/alt text */}
        <div className={styles.imageTitle}>
          <p className="text-sm font-medium truncate">
            {truncateImageTitle(image.alt)}
          </p>
        </div>
      </div>
    );
  }
);

// Export the ImageItem component as the default export
export default ImageItem;
