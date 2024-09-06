import React from "react";
import Image from '../api/image.js';  // Import the custom Image component
import { ImageInfo } from "../types.js";
import styles from "../styles/ImageItem.module.scss";
import { truncateImageTitle } from "../utils/stringUtils.js";

interface ImageItemProps {
  image: ImageInfo;
  onClick: () => void;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  groupCount?: number;
}

const ImageItem: React.FC<ImageItemProps> = React.memo(
  ({ image, onClick, containerWidth, containerHeight, zoom, groupCount }) => {
    const scaledWidth = containerWidth * zoom;
    const scaledHeight = containerHeight * zoom;

    return (
      <div
        className={`${styles.imageWrapper} ${styles.smoothTransition}`}
        style={{ width: scaledWidth, height: scaledHeight }}
        onClick={onClick}
      >
        <img
          src={image.src}
          alt={image.alt}
          className={styles.image}
        />
        <div className={styles.imageOverlay}>
          <div className={styles.imageTitle}>
            <p className="text-sm font-medium truncate">
              {truncateImageTitle(image.alt)}
            </p>
          </div>
        </div>
        {groupCount && groupCount > 1 && (
          <div className={`${styles.groupCounter} ${styles.alwaysVisible}`}>{groupCount}</div>
        )}
      </div>
    );
  }
);

export default ImageItem;
